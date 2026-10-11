import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import CartDrawer from "../components/CartDrawer";
import { useLoaderData } from "react-router";
import { cartDraft } from "../lib/cart-draft.server";
export const loader = async ({request}:LoaderFunctionArgs)=>{const {session}=await authenticate.admin(request);return cartDraft(session.shop);};
export default function CartRoute(){const draft=useLoaderData<typeof loader>();return <CartDrawer homeHref="/app" editor cloudDraft={draft} />;}
export const headers:HeadersFunction=(args)=>boundary.headers(args);
