import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import ConversionBlocks from "../components/ConversionBlocks";
import {useLoaderData} from "react-router";
import {AI_THEMES} from "../lib/ai-shopify.server";
import {graphql} from "../lib/ab-shopify.server";
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const {session,admin}=await authenticate.admin(request);
  let themes:{id:string;name:string;role:string}[]=[];
  try{themes=(await graphql<{themes:{nodes:typeof themes}}>(admin,AI_THEMES)).themes.nodes;}catch{}
  return {shop:session.shop,apiKey:process.env.SHOPIFY_API_KEY||"",themes,pricingUrl:process.env.APP_PRICING_URL||""};
};
export default function ConversionRoute() { const data=useLoaderData<typeof loader>();return <ConversionBlocks homeHref="/app" {...data}/>; }
export const headers: HeadersFunction = (args) => boundary.headers(args);
