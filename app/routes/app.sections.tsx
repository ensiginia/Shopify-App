import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import SectionsPage from "../components/SectionsPage";
import {useLoaderData} from "react-router";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const {session}=await authenticate.admin(request);
  return {shop:session.shop};
};
export default function SectionsRoute() {
  const {shop}=useLoaderData<typeof loader>();
  return <SectionsPage homeHref="/app" favoritesKey={`ss-section-favorites:${shop}`} />;
}
export const headers: HeadersFunction = (args) => boundary.headers(args);
