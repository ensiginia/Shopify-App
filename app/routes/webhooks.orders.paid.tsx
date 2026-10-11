import type { ActionFunctionArgs } from "react-router";
import { authenticate, unauthenticated } from "../shopify.server";
import db from "../db.server";
import { reconcileRefund } from "../lib/ab-refund-reconcile.server";
import { abStore } from "../lib/ab-service.server";
export async function action({ request }: ActionFunctionArgs) {
  const { shop, payload } = await authenticate.webhook(request);
  const value = payload as Record<string, unknown>;
  const result = await abStore.paidOrder(
    shop,
    value,
    process.env.SHOPIFY_API_SECRET || "",
  );
  if (result === "recorded" || result === "duplicate") {
    const { admin } = await unauthenticated.admin(shop);
    const id =
      typeof value.admin_graphql_api_id === "string"
        ? value.admin_graphql_api_id
        : `gid://shopify/Order/${value.id}`;
    await reconcileRefund(db, admin, shop, id);
  }
  return new Response(null, { status: 200 });
}
