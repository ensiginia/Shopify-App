import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { saveCartDraft } from "../lib/cart-draft.server";

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  if (request.method !== "POST") return new Response(null, { status: 405 });
  const raw = await request.text();
  if (raw.length > 200000) return Response.json({ error: "Cart draft is too large." }, { status: 413 });
  try {
    return Response.json(await saveCartDraft(session.shop, JSON.parse(raw)), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to save cart draft." }, { status: 400 });
  }
}
