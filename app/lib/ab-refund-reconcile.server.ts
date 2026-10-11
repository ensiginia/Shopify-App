import type { PrismaClient } from "@prisma/client";
import type { AdminClient } from "./ab-shopify.server";
import { graphql, REFUND_QUERY } from "./ab-shopify.server";
import { cents } from "./ab-security.server";
export async function reconcileRefund(
  db: PrismaClient,
  admin: AdminClient,
  shop: string,
  id: string,
) {
  const order = await db.abOrder.findUnique({
    where: { shop_orderId: { shop, orderId: id } },
  });
  if (!order) return;
  const data = await graphql<{
    order: {
      totalRefundedSet: { shopMoney: { amount: string; currencyCode: string } };
    } | null;
  }>(admin, REFUND_QUERY, { id });
  const total = data.order?.totalRefundedSet.shopMoney;
  const amount = cents(total?.amount);
  if (total?.currencyCode === order.currency && amount !== null)
    await db.abOrder.update({
      where: { id: order.id },
      data: { refundCents: Math.min(order.grossCents, amount) },
    });
}
