import { Prisma, type PrismaClient, type AbExperiment } from "@prisma/client";
import { assignment, createExperiment } from "./experiments";
import type { Experiment, Metric, VariantKey } from "./experiments";
import { parseSetup } from "./ab-input";
import { cents, verifyAttribution } from "./ab-security.server";

export function createAbStore(db: PrismaClient) {
  const requireTest = async (shop: string, id: string) => {
    const test = await db.abExperiment.findFirst({ where: { id, shop } });
    if (!test) throw new Error("Test not found for this shop.");
    return test;
  };
  const audit = (shop: string, id: string, action: string, detail = "") =>
    db.abAudit.create({ data: { shop, experimentId: id, action, detail } });
  async function serialize(
    row: AbExperiment,
    includeTestOrders = false,
  ): Promise<Experiment> {
    const setup = parseSetup(JSON.parse(row.setup));
    const exposures = await db.abExposure.groupBy({
      by: ["variant"],
      where: { experimentId: row.id },
      _count: true,
    });
    const orders = await db.abOrder.groupBy({
      by: ["variant", "visitorHash"],
      where: {
        experimentId: row.id,
        ...(includeTestOrders ? {} : { isTest: false }),
      },
      _sum: { grossCents: true, refundCents: true },
      _count: true,
    });
    const aggregate = (key: VariantKey): Metric => {
      const n = exposures.find((e) => e.variant === key)?._count || 0;
      const buyers = orders.filter((o) => o.variant === key);
      const revenue =
        buyers.reduce(
          (s, o) => s + (o._sum.grossCents || 0) - (o._sum.refundCents || 0),
          0,
        ) / 100;
      const count = buyers.reduce((s, o) => s + o._count, 0);
      return {
        visitors: n,
        orders: count,
        buyers: buyers.length,
        revenue,
        rpv: n ? revenue / n : 0,
        aov: count ? revenue / count : 0,
        conversion: n ? (buyers.length / n) * 100 : 0,
        refunds:
          buyers.reduce((s, o) => s + (o._sum.refundCents || 0), 0) / 100,
        sumSquares: buyers.reduce(
          (s, o) =>
            s +
            (((o._sum.grossCents || 0) - (o._sum.refundCents || 0)) / 100) ** 2,
          0,
        ),
      };
    };
    return {
      ...setup,
      id: row.id,
      status: (["Draft", "Active", "Paused", "Ended"].includes(row.status)
        ? row.status
        : "Paused") as Experiment["status"],
      createdAt: row.createdAt.toISOString(),
      startedAt: row.startedAt?.toISOString() || null,
      endedAt: row.endedAt?.toISOString() || null,
      archived: row.archived,
      selectedVariant: row.selectedVariant as VariantKey | null,
      rolloutVariant: row.rolloutVariant as VariantKey | null,
      rolloutUntil: row.rolloutUntil?.toISOString() || null,
      needsCleanup: row.status === "Ended" && !!row.operationAt,
      source: "shopify",
      version: row.version,
      visitors: {},
      orders: {},
      serverMetrics: { A: aggregate("A"), B: aggregate("B") },
    };
  }
  async function list(shop: string, includeTestOrders = false) {
    return Promise.all(
      (
        await db.abExperiment.findMany({
          where: { shop },
          orderBy: { createdAt: "desc" },
          take: 500,
        })
      ).map((t) => serialize(t, includeTestOrders)),
    );
  }
  async function save(
    shop: string,
    input: unknown,
    id?: string,
    version?: number,
  ) {
    const setup = parseSetup(input, true);
    const targetKey =
      setup.surface === "Bundles" ? `bundle:${setup.productId}` : "cart:global";
    if (id) {
      const result = await db.abExperiment.updateMany({
        where: { id, shop, version, status: "Draft", archived: false },
        data: {
          setup: JSON.stringify(setup),
          surface: setup.surface,
          targetKey,
          version: { increment: 1 },
        },
      });
      if (!result.count)
        throw new Error(
          "This draft changed in another session or has already started. Refresh and try again.",
        );
    } else {
      if ((await db.abExperiment.count({ where: { shop } })) >= 500)
        throw new Error("The workspace currently supports up to 500 tests.");
      id = createExperiment(setup).id;
      await db.abExperiment.create({
        data: {
          id,
          shop,
          setup: JSON.stringify(setup),
          surface: setup.surface,
          targetKey,
        },
      });
    }
    await audit(shop, id, "save");
    return id;
  }
  async function change(
    shop: string,
    id: string,
    version: number,
    data: Prisma.AbExperimentUpdateManyMutationInput,
    statuses: string[],
  ) {
    const result = await db.abExperiment.updateMany({
      where: { id, shop, version, status: { in: statuses } },
      data: { ...data, version: { increment: 1 } },
    });
    if (!result.count)
      throw new Error(
        "This test changed in another session. Refresh before making changes.",
      );
    return requireTest(shop, id);
  }
  async function expose(shop: string, id: string, hash: string) {
    return db.$transaction(async (tx) => {
      const t = await tx.abExperiment.findFirst({
        where: { id, shop, status: "Active", archived: false },
      });
      if (!t) throw new Error("This test is not accepting new visitors.");
      const existing = await tx.abExposure.findUnique({
        where: {
          experimentId_visitorHash: { experimentId: id, visitorHash: hash },
        },
      });
      if (existing) return existing;
      const setup = parseSetup(JSON.parse(t.setup));
      const key = assignment({ ...createExperiment(setup), id: t.id }, hash);
      return tx.abExposure.create({
        data: { experimentId: id, visitorHash: hash, variant: key },
      });
    });
  }
  async function paidOrder(
    shop: string,
    payload: Record<string, unknown>,
    secret: string,
  ) {
    const attributes = Array.isArray(payload.note_attributes)
      ? (payload.note_attributes as { name: string; value: string }[])
      : [];
    const rawToken = attributes.find(
      (a) => a.name === "_ss_ab_attribution",
    )?.value;
    if (typeof rawToken !== "string") return "unattributed";
    const paidAt =
      typeof payload.processed_at === "string"
        ? new Date(payload.processed_at)
        : new Date();
    if (!Number.isFinite(paidAt.getTime())) return "invalid";
    const token = verifyAttribution(rawToken, shop, secret, paidAt.getTime());
    if (!token) return "invalid";
    const priceSet = payload.total_price_set as
      { shop_money?: { amount?: unknown; currency_code?: string } } | undefined;
    const gross = cents(priceSet?.shop_money?.amount ?? payload.total_price);
    const currency = priceSet?.shop_money?.currency_code ?? payload.currency;
    const orderId =
      typeof payload.admin_graphql_api_id === "string"
        ? payload.admin_graphql_api_id
        : `gid://shopify/Order/${payload.id}`;
    if (
      !/^gid:\/\/shopify\/Order\/\d+$/.test(orderId) ||
      gross === null ||
      payload.financial_status !== "paid"
    )
      return "invalid";
    return db.$transaction(async (tx) => {
      const t = await tx.abExperiment.findFirst({
        where: { id: token.experimentId, shop },
      });
      if (
        !t?.startedAt ||
        paidAt < t.startedAt ||
        (t.endedAt && paidAt.getTime() > t.endedAt.getTime() + 7 * 86400000) ||
        parseSetup(JSON.parse(t.setup)).currency !== currency
      )
        return "ineligible";
      const exposure = await tx.abExposure.findUnique({
        where: {
          experimentId_visitorHash: {
            experimentId: t.id,
            visitorHash: token.visitorHash,
          },
        },
      });
      if (
        !exposure ||
        exposure.variant !== token.variant ||
        exposure.createdAt.getTime() > paidAt.getTime() + 60000
      )
        return "invalid";
      const existing = await tx.abOrder.findUnique({
        where: { shop_orderId: { shop, orderId } },
      });
      if (existing) return "duplicate";
      const refunds = await tx.abRefund.aggregate({
        where: { shop, orderId, currency: String(currency) },
        _sum: { cents: true },
      });
      await tx.abOrder.create({
        data: {
          shop,
          orderId,
          experimentId: t.id,
          visitorHash: token.visitorHash,
          variant: token.variant,
          currency: String(currency),
          grossCents: gross,
          refundCents: Math.min(gross, refunds._sum.cents || 0),
          isTest: payload.test === true,
          paidAt,
        },
      });
      return "recorded";
    });
  }
  async function refund(shop: string, payload: Record<string, unknown>) {
    const transactions = Array.isArray(payload.transactions)
      ? (payload.transactions as {
          kind: string;
          status: string;
          amount: unknown;
          currency: string;
        }[])
      : [];
    const successful = transactions.filter(
      (t) => t.kind === "refund" && t.status === "success",
    );
    const currency = successful[0]?.currency;
    const amounts = successful.map((t) => cents(t.amount));
    if (
      !currency ||
      successful.some((t) => t.currency !== currency) ||
      amounts.some((n) => n === null)
    )
      return "ignored";
    const refundCents = amounts.reduce<number>((s, n) => s + (n || 0), 0);
    if (refundCents <= 0) return "ignored";
    const refundId = String(payload.id || "");
    const orderId = `gid://shopify/Order/${payload.order_id}`;
    if (!refundId || !/^gid:\/\/shopify\/Order\/\d+$/.test(orderId))
      return "invalid";
    return db.$transaction(async (tx) => {
      if (
        await tx.abRefund.findUnique({
          where: { shop_refundId: { shop, refundId } },
        })
      )
        return "duplicate";
      await tx.abRefund.create({
        data: { shop, refundId, orderId, cents: refundCents, currency },
      });
      const order = await tx.abOrder.findUnique({
        where: { shop_orderId: { shop, orderId } },
      });
      if (order && order.currency === currency) {
        const total = await tx.abRefund.aggregate({
          where: { shop, orderId, currency },
          _sum: { cents: true },
        });
        await tx.abOrder.update({
          where: { id: order.id },
          data: {
            refundCents: Math.min(order.grossCents, total._sum.cents || 0),
          },
        });
      }
      return "recorded";
    });
  }
  const orderIds = (value: unknown) =>
    Array.isArray(value)
      ? value
          .map(String)
          .filter((id) => /^\d+$/.test(id))
          .map((id) => `gid://shopify/Order/${id}`)
      : [];
  async function dataRequest(shop: string, payload: Record<string, unknown>) {
    const ids = orderIds(payload.orders_requested);
    const orders = await db.abOrder.findMany({
      where: { shop, orderId: { in: ids } },
      select: {
        orderId: true,
        experimentId: true,
        visitorHash: true,
        variant: true,
        currency: true,
        grossCents: true,
        refundCents: true,
        paidAt: true,
      },
    });
    const requestId = String(
      (payload.data_request as { id?: unknown } | undefined)?.id ||
        "unspecified",
    );
    await audit(
      shop,
      "",
      "privacy_data_request",
      JSON.stringify({ requestId, orders }),
    );
  }
  async function redactCustomer(
    shop: string,
    payload: Record<string, unknown>,
  ) {
    const ids = orderIds(payload.orders_to_redact);
    await db.$transaction(async (tx) => {
      const orders = await tx.abOrder.findMany({
        where: { shop, orderId: { in: ids } },
        select: { visitorHash: true },
      });
      const hashes = [...new Set(orders.map((o) => o.visitorHash))];
      const relatedOrders = await tx.abOrder.findMany({
        where: { shop, visitorHash: { in: hashes } },
        select: { orderId: true },
      });
      await tx.abOrder.deleteMany({
        where: {
          shop,
          OR: [{ orderId: { in: ids } }, { visitorHash: { in: hashes } }],
        },
      });
      await tx.abExposure.deleteMany({
        where: { visitorHash: { in: hashes }, experiment: { shop } },
      });
      await tx.abRefund.deleteMany({
        where: {
          shop,
          orderId: { in: [...ids, ...relatedOrders.map((o) => o.orderId)] },
        },
      });
      await tx.abAudit.deleteMany({
        where: { shop, action: "privacy_data_request" },
      });
    });
  }
  async function redactShop(shop: string) {
    await db.$transaction(async (tx) => {
      await tx.abExperiment.deleteMany({ where: { shop } });
      await tx.abRefund.deleteMany({ where: { shop } });
      await tx.abAudit.deleteMany({ where: { shop } });
      await tx.session.deleteMany({ where: { shop } });
    });
  }
  return {
    list,
    save,
    requireTest,
    change,
    expose,
    paidOrder,
    refund,
    audit,
    serialize,
    dataRequest,
    redactCustomer,
    redactShop,
  };
}
