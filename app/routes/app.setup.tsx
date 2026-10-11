import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData, useRevalidator } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { graphql } from "../lib/ab-shopify.server";
import { AI_CONTEXT } from "../lib/ai-shopify.server";

const features = [
  { name: "Store products", scopes: ["write_products"], note: "Used for product content and template assignment." },
  { name: "Order attribution", scopes: ["read_orders"], note: "Used for paid-order and refund attribution in A/B tests." },
  { name: "Theme discovery", scopes: ["read_themes"], note: "Required to list themes and read app-owned template files." },
  { name: "Experiment discounts", scopes: ["write_discounts"], note: "Required when creating real experiment discounts." },
  { name: "Page publishing", scopes: ["write_content"], note: "Required when publishing generated Shopify pages." },
  { name: "Theme file publishing", scopes: ["write_themes"], note: "Requires Shopify approval for theme-write access in addition to the permission." },
];

export async function loader({ request }: LoaderFunctionArgs) {
  const { session, admin } = await authenticate.admin(request);
  let scopes: string[] = [], name = session.shop, error = "";
  try {
    const data = await graphql<{ shop: { name: string }; currentAppInstallation: { accessScopes: { handle: string }[] } }>(admin, AI_CONTEXT);
    name = data.shop.name;
    scopes = data.currentAppInstallation.accessScopes.map(scope => scope.handle);
  } catch {
    error = "Shopify connection could not be verified. Retry from Shopify admin.";
  }
  return {
    shop: session.shop, name, error,
    features: features.map(feature => ({ ...feature, granted: feature.scopes.every(scope => scopes.includes(scope)) })),
    aiConfigured: Boolean(process.env.OPENAI_API_KEY && process.env.AI_MODEL),
    experimentsEnabled: process.env.AB_LIVE_ENABLED === "true",
    themeWritesEnabled: process.env.AI_THEME_WRITE_ENABLED === "true",
  };
}

export default function Setup() {
  const data = useLoaderData<typeof loader>();
  const revalidator = useRevalidator();
  return <s-page heading="Shopify connection & setup">
    <s-button slot="primary-action" onClick={() => revalidator.revalidate()} disabled={revalidator.state !== "idle"}>Refresh connection</s-button>
    <s-section heading={data.name}>
      <s-paragraph>{data.shop}</s-paragraph>
      <s-paragraph>{data.error || "Shopify Admin API connection verified."}</s-paragraph>
    </s-section>
    <s-section heading="Feature permissions">
      {data.features.map(feature => <div key={feature.name} style={{ marginBottom: 16 }}>
        <s-heading>{feature.name}: {data.error ? "Unverified" : feature.granted ? "Permission granted" : "Permission required"}</s-heading>
        <s-paragraph>{feature.note}</s-paragraph>
      </div>)}
      <s-paragraph>Permissions are granted by Shopify and the merchant. Enable a feature through its setup flow before using it.</s-paragraph>
    </s-section>
    <s-section heading="Service status">
      <s-paragraph>AI provider: {data.aiConfigured ? "Configured; generation still requires a successful provider response." : "Requires provider configuration."}</s-paragraph>
      <s-paragraph>A/B storefront delivery: {data.experimentsEnabled ? "Enabled; verify the app embed in your theme." : "Disabled pending store setup and testing."}</s-paragraph>
      <s-paragraph>Theme file publishing: {data.themeWritesEnabled ? "Enabled; Shopify approval and theme permissions also required." : "Disabled pending Shopify approval and theme testing."}</s-paragraph>
    </s-section>
    <s-section heading="Activate storefront blocks">
      <s-paragraph>In Shopify admin, open Online Store → Themes → Customize. For A/B experiments enable the app embed. For conversion blocks open a compatible template, select Add block → Apps, add the desired block, preview it, and save the theme.</s-paragraph>
      <s-paragraph>Cart Drawer designs are saved as drafts. Cart Drawer publishing, section purchases, and general bundle offers still require their storefront integrations before they can be used by customers.</s-paragraph>
    </s-section>
  </s-page>;
}

export function ErrorBoundary() { return boundary.error(useRouteError()); }
import { useRouteError } from "react-router";
export const headers: HeadersFunction = args => boundary.headers(args);
