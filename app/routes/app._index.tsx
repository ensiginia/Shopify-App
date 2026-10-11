import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { useAppBridge } from "@shopify/app-bridge-react";
import Dashboard from "../components/Dashboard";
import { useNavigate } from "react-router";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export default function Index() {
  const navigate = useNavigate();
  const shopify = useAppBridge();
  return <Dashboard auditLive onAuditBrowse={query => navigate("/app/sections?q=" + encodeURIComponent(query))} onAuditPermissions={async () => { const result = await shopify.scopes.request(["read_themes"]); if (result.result !== "granted-all") throw new Error("Theme permissions were declined."); }} onAI={how => navigate("/app/ai-pages" + (how ? "?how=1" : ""))} onCart={() => navigate("/app/cart-drawer")} onBundles={() => navigate("/app/bundles")} onExplore={() => navigate("/app/sections")} onConversion={() => navigate("/app/conversion-blocks")} />;
}

export const headers: HeadersFunction = (headersArgs) =>
  boundary.headers(headersArgs);
