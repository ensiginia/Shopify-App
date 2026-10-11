import type { ActionFunctionArgs } from "react-router";
import { authenticate, unauthenticated } from "../shopify.server";
import { abStore } from "../lib/ab-service.server";
import { reconcileRefund } from "../lib/ab-refund-reconcile.server";
import db from "../db.server";
export async function action({ request }: ActionFunctionArgs) {
  const { shop, payload } = await authenticate.webhook(request);
  const value = payload as Record<string, unknown>;
  await abStore.refund(shop, value);
  // Query authoritative shop-currency totals, including refunds in other presentment currencies.
  const id = `gid://shopify/Order/${value.order_id}`;
  if (!/^gid:\/\/shopify\/Order\/\d+$/.test(id))
    return new Response(null, { status: 200 });
  const order = await db.abOrder.findUnique({
    where: { shop_orderId: { shop, orderId: id } },
  });
  if (order) {
    const { admin } = await unauthenticated.admin(shop);
    await reconcileRefund(db, admin, shop, id);
  }
  return new Response(null, { status: 200 });
}
