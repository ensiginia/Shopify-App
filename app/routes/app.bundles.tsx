import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import BundlesPage from "../components/BundlesPage";
export const loader = async ({ request }: LoaderFunctionArgs) => { await authenticate.admin(request); return null; };
export default function BundlesRoute() { return <BundlesPage homeHref="/app" />; }
export const headers: HeadersFunction = (args) => boundary.headers(args);
