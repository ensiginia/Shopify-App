import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { abStore, reconcile } from "../lib/ab-service.server";
import { parseSetup } from "../lib/ab-input";
import { assignment } from "../lib/experiments";
import { signAttribution, visitorHash } from "../lib/ab-security.server";
import type { Discounts } from "../lib/ab-shopify.server";

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store, private" },
  });
async function proxy(request: Request) {
  const { session } = await authenticate.public.appProxy(request);
  if (!session || process.env.AB_LIVE_ENABLED !== "true")
    throw new Response(null, { status: 404 });
  const timestamp = Number(new URL(request.url).searchParams.get("timestamp"));
  if (!timestamp || Math.abs(Date.now() / 1000 - timestamp) > 300)
    throw new Response(null, { status: 401 });
  if (
    /bot|crawler|spider|headless|preview/i.test(
      request.headers.get("user-agent") || "",
    )
  )
    throw new Response(null, { status: 204 });
  await reconcile(session.shop);
  return session.shop;
}
export async function loader({ request }: LoaderFunctionArgs) {
  const shop = await proxy(request);
  const url = new URL(request.url);
  const surface = url.searchParams.get("surface");
  const targetKey =
    surface === "Bundles"
      ? `bundle:gid://shopify/Product/${url.searchParams.get("productId")}`
      : "cart:global";
  const test = await db.abExperiment.findFirst({
    where: {
      shop,
      targetKey,
      archived: false,
      OR: [{ status: "Active" }, { rolloutVariant: { not: null } }],
    },
  });
  if (!test) return json({ test: null });
  const setup = parseSetup(JSON.parse(test.setup));
  if (url.searchParams.get("currency") !== setup.currency)
    return json({ test: null });
  const secret = process.env.SHOPIFY_API_SECRET || "";
  const hash = test.rolloutVariant
    ? ""
    : visitorHash(shop, url.searchParams.get("visitor") || "", secret);
  const exposure = hash
    ? await db.abExposure.findUnique({
        where: {
          experimentId_visitorHash: {
            experimentId: test.id,
            visitorHash: hash,
          },
        },
      })
    : null;
  const variant = (test.rolloutVariant ||
    exposure?.variant ||
    assignment(
      { ...setup, id: test.id, visitors: {} } as Parameters<
        typeof assignment
      >[0],
      hash,
    )) as "A" | "B";
  const discounts: Discounts = JSON.parse(test.discounts);
  return json({
    test: {
      id: test.id,
      variant,
      settings: setup.variants[variant],
      currency: setup.currency,
      productId: setup.productId,
      upsellProductId: setup.upsellProductId,
      upsellVariantId: setup.upsellVariantId,
      upsellHandle: setup.upsellHandle,
      discountCode: discounts[variant]?.code || null,
      rollout: !!test.rolloutVariant,
    },
  });
}
export async function action({ request }: ActionFunctionArgs) {
  const shop = await proxy(request);
  const raw = await request.text();
  if (raw.length > 8192) return json({ error: "Request too large." }, 413);
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    if (data.intent !== "expose" || data.consent !== true)
      return json({ error: "Consent and exposure are required." }, 400);
    const id = String(data.id || "");
    const test = await db.abExperiment.findFirst({
      where: { id, shop, status: "Active", archived: false },
    });
    if (!test) return json({ error: "Test has ended or is paused." }, 409);
    const setup = parseSetup(JSON.parse(test.setup));
    if (
      data.currency !== setup.currency ||
      (setup.surface === "Bundles" && data.productId !== setup.productId)
    )
      return json({ error: "Ineligible exposure." }, 400);
    const secret = process.env.SHOPIFY_API_SECRET || "";
    const hash = visitorHash(shop, String(data.visitor || ""), secret);
    const exposure = await abStore.expose(shop, id, hash);
    const token = signAttribution(
      {
        shop,
        experimentId: id,
        variant: exposure.variant as "A" | "B",
        visitorHash: hash,
        issuedAt: Date.now(),
      },
      secret,
    );
    return json({ token, variant: exposure.variant });
  } catch {
    return json({ error: "Invalid exposure request." }, 400);
  }
}
