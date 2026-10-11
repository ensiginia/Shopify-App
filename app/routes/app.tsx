import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";

import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  // eslint-disable-next-line no-undef
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    <AppProvider apiKey={apiKey}>
      <s-app-nav>
        <s-link href="/app">Dashboard</s-link>
        <s-link href="/app/ai-pages">AI Pages</s-link>
        <s-link href="/app/sections">Sections</s-link>
        <s-link href="/app/cart-drawer">Cart Drawer</s-link>
        <s-link href="/app/bundles">Bundles</s-link>
        <s-link href="/app/ab-tests">A/B Tests</s-link>
        <s-link href="/app/conversion-blocks">Conversion Blocks</s-link>
        <s-link href="/app/help?view=faq">Help & Resources</s-link>
        <s-link href="/app/setup">Shopify Setup</s-link>
      </s-app-nav>
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
