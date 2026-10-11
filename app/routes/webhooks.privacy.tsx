import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { eraseShopData } from "../lib/shop-data.server";
import { abStore } from "../lib/ab-service.server";
export async function action({ request }: ActionFunctionArgs) {
  const { shop, topic, payload } = await authenticate.webhook(request);
  const data = payload as Record<string, unknown>;
  if (topic === "CUSTOMERS_DATA_REQUEST") await abStore.dataRequest(shop, data);
  else if (topic === "CUSTOMERS_REDACT")
    await abStore.redactCustomer(shop, data);
  else if (topic === "SHOP_REDACT") {
    await eraseShopData(shop);
  }
  else return new Response(null, { status: 400 });
  return new Response(null, { status: 200 });
}
