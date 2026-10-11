import { useMemo } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useLoaderData } from "react-router";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { aiService } from "../lib/ai-service.server";
import { listTemplates } from "../lib/ai-shopify.server";
import { PAGE_KINDS } from "../lib/ai-pages";
import type { AIClient, AIWorkspace, PageKind } from "../lib/ai-pages";
import AIPages from "../components/AIPages";
export async function loader({ request }: LoaderFunctionArgs) {
  const { session, admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  if (url.searchParams.has("export")) {
    try {
      return Response.json({
        files: await aiService.exportPage(
          session.shop,
          url.searchParams.get("export") || "",
          admin,
        ),
      });
    } catch (error) {
      return Response.json(
        { error: (error as Error).message },
        { status: 400 },
      );
    }
  }
  if (url.searchParams.get("templates") === "1") {
    const id = url.searchParams.get("themeId") || "",
      kind = url.searchParams.get("kind") as PageKind;
    if (
      !/^gid:\/\/shopify\/OnlineStoreTheme\/\d+$/.test(id) ||
      !PAGE_KINDS.includes(kind)
    )
      return Response.json(
        { error: "Invalid theme or page type." },
        { status: 400 },
      );
    try {
      return Response.json({ templates: await listTemplates(admin, id, kind) });
    } catch (error) {
      return Response.json(
        { error: (error as Error).message },
        { status: 400 },
      );
    }
  }
  return Response.json(await aiService.workspace(session.shop, admin));
}
export async function action({ request }: ActionFunctionArgs) {
  const { session, admin } = await authenticate.admin(request);
  const raw = await request.text();
  if (raw.length > 100000)
    return Response.json(
      { error: "Page request is too large." },
      { status: 413 },
    );
  try {
    const body = JSON.parse(raw);
    if (
      !body ||
      typeof body.intent !== "string" ||
      !body.payload ||
      typeof body.payload !== "object" ||
      Array.isArray(body.payload)
    )
      throw new Error("Invalid page action.");
    return Response.json(
      await aiService.command(session.shop, admin, body.intent, body.payload),
    );
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 400 });
  }
}
export default function AIPagesRoute() {
  const initial = useLoaderData() as AIWorkspace;
  const shopify = useAppBridge();
  const client = useMemo<AIClient>(
    () => ({
      async load() {
        const r = await fetch("/app/ai-pages");
        if (!r.ok) throw new Error("Workspace could not be refreshed.");
        return await r.json();
      },
      async command(intent, payload) {
        const r = await fetch("/app/ai-pages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ intent, payload }),
        });
        const body = await r.json();
        if (!r.ok) throw new Error(body.error || "Action failed.");
        return body;
      },
      async requestScopes(scopes) {
        const result = await shopify.scopes.request(scopes);
        if (result.result !== "granted-all")
          throw new Error("Shopify permissions were declined.");
      },
      async export(id) {
        const r = await fetch("/app/ai-pages?export=" + id);
        const b = await r.json();
        if (!r.ok) throw new Error(b.error);
        return b.files;
      },
      async pick(type) {
        const selection = await shopify.resourcePicker({
          type,
          action: "select",
          multiple: false,
        });
        const resource = selection?.[0];
        return resource
          ? { id: resource.id, title: resource.title }
          : undefined;
      },
      async templates(themeId, kind) {
        const r = await fetch(
          "/app/ai-pages?templates=1&themeId=" +
            encodeURIComponent(themeId) +
            "&kind=" +
            kind,
        );
        const body = await r.json();
        if (!r.ok) throw new Error(body.error);
        return body.templates;
      },
    }),
    [shopify],
  );
  return <AIPages homeHref="/app" client={client} initialWorkspace={initial} />;
}
export const headers: HeadersFunction = (args) => boundary.headers(args);
