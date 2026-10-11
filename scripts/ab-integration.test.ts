import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync } from "node:fs";
import { join, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { createAbStore } from "../app/lib/ab-store.server";
import {
  visitorHash,
  signAttribution,
  verifyAttribution,
  cents,
} from "../app/lib/ab-security.server";
import { defaults, createExperiment, metrics } from "../app/lib/experiments";
import { analyze } from "../app/lib/experiment-analysis";
import { reconcileRefund } from "../app/lib/ab-refund-reconcile.server";
import { parseSetup } from "../app/lib/ab-input";
import {
  ensureDiscount,
  extendDiscount,
  type AdminClient,
} from "../app/lib/ab-shopify.server";

const dir = mkdtempSync(resolve("node_modules/.cache/ab-db-"));
const db = new PrismaClient({
  datasourceUrl: "file:" + join(dir, "test.sqlite").replaceAll("\\", "/"),
});
const store = createAbStore(db);
const shop = "test-a.myshopify.com",
  otherShop = "test-b.myshopify.com",
  secret = "integration-test-secret";
const setup = () => ({
  ...defaults("Carts"),
  name: "Shipping goal",
  hypothesis: "Lower goal increases revenue.",
});
before(async () => {
  await db.$executeRawUnsafe(
    'CREATE TABLE "Session" ("id" TEXT PRIMARY KEY, "shop" TEXT NOT NULL)',
  );
  for (const file of [
    "20261010080000_ab_experiments",
    "20261010081000_ab_operation_recovery",
  ]) {
    const sql = readFileSync(
      "prisma/migrations/" + file + "/migration.sql",
      "utf8",
    );
    for (const statement of sql.split(";").filter((s) => s.trim()))
      await db.$executeRawUnsafe(statement);
  }
});
after(async () => {
  await db.$disconnect();
});

async function running() {
  const id = await store.save(shop, setup());
  await store.change(
    shop,
    id,
    1,
    { status: "Active", startedAt: new Date(Date.now() - 60000) },
    ["Draft"],
  );
  const hash = visitorHash(shop, crypto.randomUUID(), secret);
  const exposure = await store.expose(shop, id, hash);
  const token = signAttribution(
    {
      shop,
      experimentId: id,
      visitorHash: hash,
      variant: exposure.variant as "A" | "B",
      issuedAt: Date.now() - 1000,
    },
    secret,
  );
  return { id, hash, exposure, token };
}
function order(token: string, number: number, extra = {}) {
  return {
    id: number,
    admin_graphql_api_id: "gid://shopify/Order/" + number,
    note_attributes: [{ name: "_ss_ab_attribution", value: token }],
    processed_at: new Date().toISOString(),
    financial_status: "paid",
    total_price_set: { shop_money: { amount: "100.23", currency_code: "USD" } },
    ...extra,
  };
}
test("Tenant ownership and version checks protect server mutations", async () => {
  const id = await store.save(shop, setup());
  await assert.rejects(store.requireTest(otherShop, id), /not found/);
  await assert.rejects(store.save(otherShop, setup(), id, 1), /changed/);
  await store.save(shop, { ...setup(), name: "Changed" }, id, 1);
  await assert.rejects(store.save(shop, setup(), id, 1), /changed/);
  const row = await store.requireTest(shop, id);
  assert.equal(row.version, 2);
  assert.equal((await store.list(otherShop)).length, 0);
});
test("Unique storefront ownership is enforced by the database", async () => {
  const id = await store.save(shop, setup()),
    id2 = await store.save(shop, setup());
  await store.change(shop, id, 1, { activeTargetKey: "storefront" }, ["Draft"]);
  await assert.rejects(
    store.change(shop, id2, 1, { activeTargetKey: "storefront" }, ["Draft"]),
  );
  const other = await store.save(otherShop, setup());
  await store.change(otherShop, other, 1, { activeTargetKey: "storefront" }, [
    "Draft",
  ]);
});
test("Sticky exposures are unique and paused tests stop accepting visitors", async () => {
  const t = await running();
  assert.equal((await store.expose(shop, t.id, t.hash)).id, t.exposure.id);
  assert.equal(await db.abExposure.count({ where: { experimentId: t.id } }), 1);
  await store.change(shop, t.id, 2, { status: "Paused" }, ["Active"]);
  await assert.rejects(store.expose(shop, t.id, t.hash), /not accepting/);
});
test("Signed attribution rejects tampering, wrong shops, expiry and future tokens", () => {
  const value = {
    shop,
    experimentId: "x",
    visitorHash: "a".repeat(64),
    variant: "A" as const,
    issuedAt: Date.now(),
  };
  const token = signAttribution(value, secret);
  assert.ok(verifyAttribution(token, shop, secret));
  assert.equal(verifyAttribution(token + "x", shop, secret), null);
  assert.equal(verifyAttribution(token, otherShop, secret), null);
  assert.equal(
    verifyAttribution(token, shop, secret, value.issuedAt + 7 * 86400000 + 1),
    null,
  );
  assert.equal(
    verifyAttribution(token, shop, secret, value.issuedAt - 60001),
    null,
  );
  assert.notEqual(
    visitorHash(shop, "visitor-123", secret),
    visitorHash(otherShop, "visitor-123", secret),
  );
  assert.throws(() => visitorHash(shop, "../bad", secret));
  assert.equal(cents("10.23"), 1023);
  assert.equal(cents("10.234"), null);
  assert.equal(cents("-2"), null);
});
test("Paid-order ingestion deduplicates, verifies exposure, and excludes test orders", async () => {
  const t = await running();
  assert.equal(
    await store.paidOrder(shop, order(t.token, 100), secret),
    "recorded",
  );
  assert.equal(
    await store.paidOrder(shop, order(t.token, 100), secret),
    "duplicate",
  );
  assert.equal(
    await store.paidOrder(otherShop, order(t.token, 101), secret),
    "invalid",
  );
  assert.equal(
    await store.paidOrder(
      shop,
      order(t.token, 102, { financial_status: "pending" }),
      secret,
    ),
    "invalid",
  );
  assert.equal(
    await store.paidOrder(shop, order(t.token, 103, { test: true }), secret),
    "recorded",
  );
  const serialized = await store.serialize(await store.requireTest(shop, t.id));
  const m = metrics(serialized, t.exposure.variant as "A" | "B");
  assert.equal(m.orders, 1);
  assert.equal(m.revenue, 100.23);
  assert.equal(m.buyers, 1);
  assert.deepEqual(serialized.visitors, {});
  assert.deepEqual(serialized.orders, {});
  assert.equal(
    metrics(
      await store.serialize(await store.requireTest(shop, t.id), true),
      t.exposure.variant as "A" | "B",
    ).orders,
    2,
  );
  const forged = signAttribution(
    {
      shop,
      experimentId: t.id,
      visitorHash: "b".repeat(64),
      variant: "A",
      issuedAt: Date.now(),
    },
    secret,
  );
  assert.equal(
    await store.paidOrder(shop, order(forged, 104), secret),
    "invalid",
  );
});
test("Refunds reconcile before orders, deduplicate, and cap at gross revenue", async () => {
  const t = await running();
  const refund = (id: number, amount: string) => ({
    id,
    order_id: 200,
    transactions: [
      { kind: "refund", status: "success", amount, currency: "USD" },
    ],
  });
  assert.equal(await store.refund(shop, refund(1, "20.10")), "recorded");
  assert.equal(await store.refund(shop, refund(1, "20.10")), "duplicate");
  await store.paidOrder(shop, order(t.token, 200), secret);
  let row = (await db.abOrder.findUnique({
    where: { shop_orderId: { shop, orderId: "gid://shopify/Order/200" } },
  }))!;
  assert.equal(row.refundCents, 2010);
  await store.refund(shop, refund(2, "1000"));
  row = (await db.abOrder.findUnique({ where: { id: row.id } }))!;
  assert.equal(row.refundCents, row.grossCents);
  assert.equal(
    metrics(
      await store.serialize(await store.requireTest(shop, t.id)),
      t.exposure.variant as "A" | "B",
    ).revenue,
    0,
  );
});
test("Wrong currencies and orders beyond the attribution horizon are rejected", async () => {
  const t = await running();
  assert.equal(
    await store.paidOrder(
      shop,
      order(t.token, 300, {
        total_price_set: { shop_money: { amount: "10", currency_code: "EUR" } },
      }),
      secret,
    ),
    "ineligible",
  );
  await store.change(
    shop,
    t.id,
    2,
    { status: "Ended", endedAt: new Date(Date.now() - 8 * 86400000) },
    ["Active"],
  );
  assert.equal(
    await store.paidOrder(shop, order(t.token, 301), secret),
    "ineligible",
  );
});
test("Copying a live test strips all results, rollout and server identity", () => {
  const live = {
    ...createExperiment(setup()),
    source: "shopify",
    serverMetrics: {
      A: {
        visitors: 2,
        orders: 1,
        buyers: 1,
        revenue: 30,
        rpv: 15,
        aov: 30,
        conversion: 50,
      },
      B: {
        visitors: 0,
        orders: 0,
        buyers: 0,
        revenue: 0,
        rpv: 0,
        aov: 0,
        conversion: 0,
      },
    },
    rolloutVariant: "B",
    version: 12,
  };
  const copied = createExperiment(live);
  assert.equal(copied.source, "preview");
  assert.equal(copied.serverMetrics, undefined);
  assert.equal(copied.rolloutVariant, undefined);
  assert.equal(copied.version, undefined);
  assert.equal(metrics(copied, "A").revenue, 0);
  assert.throws(
    () => parseSetup({ ...setup(), currency: "JPY" }),
    /two decimal/,
  );
});
test("Statistics gate early looks, traffic imbalance and immature live attribution", () => {
  const t = createExperiment({ ...setup(), minimumVisitors: 500 });
  t.status = "Ended";
  t.startedAt = new Date(Date.now() - 20 * 86400000).toISOString();
  t.endedAt = new Date(Date.now() - 8 * 86400000).toISOString();
  t.serverMetrics = {
    A: {
      visitors: 1000,
      orders: 100,
      buyers: 100,
      revenue: 1000,
      rpv: 1,
      aov: 10,
      conversion: 10,
      sumSquares: 10000,
    },
    B: {
      visitors: 1000,
      orders: 200,
      buyers: 200,
      revenue: 2000,
      rpv: 2,
      aov: 10,
      conversion: 20,
      sumSquares: 20000,
    },
  };
  assert.equal(analyze(t).supported, "B");
  assert.equal(analyze({ ...t, status: "Active" }).interval, null);
  assert.equal(
    analyze({ ...t, source: "shopify", endedAt: new Date().toISOString() })
      .interval,
    null,
  );
  assert.equal(
    analyze({
      ...t,
      serverMetrics: {
        ...t.serverMetrics,
        B: { ...t.serverMetrics.B, visitors: 100 },
      },
    }).mismatch,
    true,
  );
});
test("Native offer generation uses real Shopify discount inputs and remote error checks", async () => {
  const calls: { query: string; variables?: Record<string, unknown> }[] = [];
  const admin: AdminClient = {
    graphql: async (query, options) => {
      calls.push({ query, variables: options?.variables });
      const data = query.includes("ABDiscount(")
        ? { codeDiscountNodeByCode: null }
        : query.includes("ABBundleDiscount(")
          ? {
              discountCodeBasicCreate: {
                codeDiscountNode: { id: "gid://shopify/DiscountCodeNode/1" },
                userErrors: [],
              },
            }
          : query.includes("ABShippingDiscount(")
            ? {
                discountCodeFreeShippingCreate: {
                  codeDiscountNode: { id: "gid://shopify/DiscountCodeNode/2" },
                  userErrors: [],
                },
              }
            : query.includes("ABUpdateBundle(")
              ? {
                  discountCodeBasicUpdate: {
                    codeDiscountNode: { id: "1" },
                    userErrors: [],
                  },
                }
              : {
                  discountCodeActivate: {
                    codeDiscountNode: { id: "1" },
                    userErrors: [],
                  },
                };
      return Response.json({ data });
    },
  };
  const bundle = {
    ...defaults("Bundles"),
    name: "Bundle",
    hypothesis: "Compare quantity",
    productId: "gid://shopify/Product/1",
  };
  const discount = await ensureDiscount(
    admin,
    "test-id",
    bundle,
    "B",
    new Date(),
  )!;
  const input = calls[1].variables?.input as {
    customerGets: { value: { percentage: number } };
    minimumRequirement: { quantity: { greaterThanOrEqualToQuantity: string } };
  };
  assert.equal(input.customerGets.value.percentage, 0.15);
  assert.equal(
    input.minimumRequirement.quantity.greaterThanOrEqualToQuantity,
    "3",
  );
  await extendDiscount(admin, discount!, new Date(Date.now() + 86400000));
  await ensureDiscount(admin, "cart-id", setup(), "B", new Date());
  const shipping = calls.at(-1)?.variables?.input as {
    minimumRequirement: { subtotal: { greaterThanOrEqualToSubtotal: string } };
  };
  assert.equal(
    shipping.minimumRequirement.subtotal.greaterThanOrEqualToSubtotal,
    "80.00",
  );
  const failed: AdminClient = {
    graphql: async () => Response.json({ errors: [{ message: "Denied" }] }),
  };
  await assert.rejects(
    ensureDiscount(failed, "id", bundle, "A", new Date()),
    /Denied/,
  );
});

test("Customer data requests and redaction are scoped and remove linked anonymous records", async () => {
  const t = await running();
  await store.paidOrder(shop, order(t.token, 500), secret);
  await store.dataRequest(shop, {
    orders_requested: [500],
    customer: { email: "do-not-store@example.test" },
    data_request: { id: 99 },
  });
  const audit = (await db.abAudit.findFirst({
    where: { shop, action: "privacy_data_request" },
    orderBy: { createdAt: "desc" },
  }))!;
  assert.equal(
    JSON.parse(audit.detail).orders[0].orderId,
    "gid://shopify/Order/500",
  );
  assert.equal(audit.detail.includes("do-not-store"), false);
  const otherCount = await db.abExperiment.count({
    where: { shop: otherShop },
  });
  await store.redactCustomer(shop, { orders_to_redact: [500] });
  assert.equal(
    await db.abOrder.count({ where: { shop, visitorHash: t.hash } }),
    0,
  );
  assert.equal(
    await db.abExposure.count({
      where: { experimentId: t.id, visitorHash: t.hash },
    }),
    0,
  );
  assert.equal(
    await db.abExperiment.count({ where: { shop: otherShop } }),
    otherCount,
  );
});
test("Live lifecycle gates delivery, freezes setup, pauses, matures and recovers failed cleanup", async () => {
  const { createAbService, AB_SCOPES } =
    await import("../app/lib/ab-lifecycle.server");
  const service = createAbService(db),
    tenant = "lifecycle.myshopify.com";
  const oldLive = process.env.AB_LIVE_ENABLED;
  const discounts = new Map<string, string>();
  let failDeactivate = false;
  let failExpiry = false;
  const admin: AdminClient = {
    graphql: async (query, options) => {
      const variables = options?.variables;
      if (failExpiry && query.includes("ABUpdateShipping("))
        return Response.json({
          errors: [{ message: "Temporary expiry update failure" }],
        });
      let data: Record<string, unknown>;
      if (query.includes("ABContext"))
        data = {
          shop: {
            currencyCode: "USD",
            primaryDomain: { url: "https://lifecycle.example.test" },
          },
          currentAppInstallation: {
            accessScopes: AB_SCOPES.map((handle) => ({ handle })),
            activeSubscriptions: [],
          },
          products: { nodes: [] },
        };
      else if (query.includes("ABDiscount("))
        data = {
          codeDiscountNodeByCode: discounts.has(String(variables?.code))
            ? { id: discounts.get(String(variables?.code)) }
            : null,
        };
      else if (query.includes("ABShippingDiscount(")) {
        const input = variables?.input as { code: string };
        const id = "gid://shopify/DiscountCodeNode/" + (discounts.size + 1);
        discounts.set(input.code, id);
        data = {
          discountCodeFreeShippingCreate: {
            codeDiscountNode: { id },
            userErrors: [],
          },
        };
      } else if (query.includes("ABDeactivate(")) {
        if (failDeactivate)
          return Response.json({
            errors: [{ message: "Temporary native cleanup failure" }],
          });
        data = {
          discountCodeDeactivate: {
            codeDiscountNode: { id: variables?.id },
            userErrors: [],
          },
        };
      } else if (query.includes("ABUpdateShipping("))
        data = {
          discountCodeFreeShippingUpdate: {
            codeDiscountNode: { id: variables?.id },
            userErrors: [],
          },
        };
      else
        data = {
          discountCodeActivate: {
            codeDiscountNode: { id: variables?.id },
            userErrors: [],
          },
        };
      return Response.json({ data });
    },
  };
  try {
    const saved = await service.mutate(tenant, admin, "save", {
      setup: setup(),
    });
    const id = saved[0].id;
    process.env.AB_LIVE_ENABLED = "false";
    await assert.rejects(
      service.mutate(tenant, admin, "start", { id, version: 1 }),
      /disabled/,
    );
    process.env.AB_LIVE_ENABLED = "true";
    let rows = await service.mutate(tenant, admin, "start", { id, version: 1 });
    assert.equal(rows[0].status, "Active");
    assert.equal(discounts.size, 2);
    await assert.rejects(
      service.mutate(tenant, admin, "save", {
        id,
        version: rows[0].version,
        setup: setup(),
      }),
      /already started/,
    );
    rows = await service.mutate(tenant, admin, "pause", {
      id,
      version: rows[0].version,
    });
    assert.equal(rows[0].status, "Paused");
    rows = await service.mutate(tenant, admin, "resume", {
      id,
      version: rows[0].version,
    });
    assert.equal(rows[0].status, "Active");
    assert.equal(discounts.size, 2);
    failExpiry = true;
    await assert.rejects(
      service.mutate(tenant, admin, "end", {
        id,
        version: rows[0].version,
        selectedVariant: "A",
      }),
      /expiry update failure/,
    );
    rows = await service.abStore.list(tenant);
    assert.equal(rows[0].status, "Paused");
    assert.equal(
      (await service.abStore.requireTest(tenant, id)).activeTargetKey,
      "storefront",
    );
    failExpiry = false;
    rows = await service.mutate(tenant, admin, "end", {
      id,
      version: rows[0].version,
      selectedVariant: "A",
    });
    assert.equal(rows[0].status, "Ended");
    await assert.rejects(
      service.mutate(tenant, admin, "rollout", {
        id,
        version: rows[0].version,
        variant: "A",
        acknowledged: true,
      }),
      /7-day/,
    );
    await db.abExperiment.update({
      where: { id },
      data: { endedAt: new Date(Date.now() - 8 * 86400000) },
    });
    rows = await service.mutate(tenant, admin, "rollout", {
      id,
      version: rows[0].version,
      variant: "A",
      acknowledged: true,
    });
    assert.equal(rows[0].rolloutVariant, "A");
    assert.ok(rows[0].rolloutUntil);
    failDeactivate = true;
    await assert.rejects(
      service.mutate(tenant, admin, "stop-rollout", {
        id,
        version: rows[0].version,
      }),
      /cleanup failure/,
    );
    let current = await service.abStore.requireTest(tenant, id);
    assert.equal(current.rolloutVariant, null);
    assert.equal(current.activeTargetKey, "storefront");
    assert.ok(current.operationAt);
    await service.reconcile(tenant);
    assert.equal(
      (await service.abStore.requireTest(tenant, id)).activeTargetKey,
      "storefront",
    );
    failDeactivate = false;
    await db.abExperiment.update({
      where: { id },
      data: { operationAt: new Date(Date.now() - 360000) },
    });
    current = await service.abStore.requireTest(tenant, id);
    rows = await service.mutate(tenant, admin, "stop-rollout", {
      id,
      version: current.version,
    });
    assert.equal(rows[0].needsCleanup, false);
    assert.equal(
      (await service.abStore.requireTest(tenant, id)).activeTargetKey,
      null,
    );
  } finally {
    if (oldLive === undefined) delete process.env.AB_LIVE_ENABLED;
    else process.env.AB_LIVE_ENABLED = oldLive;
  }
});
test("Shop redaction cascades experiment records and preserves other tenants", async () => {
  const otherCount = await db.abExperiment.count({
    where: { shop: otherShop },
  });
  await store.redactShop(shop);
  assert.equal(await db.abExperiment.count({ where: { shop } }), 0);
  assert.equal(await db.abOrder.count({ where: { shop } }), 0);
  assert.equal(await db.abAudit.count({ where: { shop } }), 0);
  assert.equal(
    await db.abExperiment.count({ where: { shop: otherShop } }),
    otherCount,
  );
});

test("Authoritative shop-currency refund totals reconcile foreign-currency refunds before payment", async () => {
  const t = await running();
  await store.refund(shop, {
    id: 1001,
    order_id: 601,
    transactions: [
      { kind: "refund", status: "success", currency: "EUR", amount: "30.00" },
    ],
  });
  await store.paidOrder(shop, order(t.token, 601), secret);
  const id = "gid://shopify/Order/601";
  const before = (await db.abOrder.findUnique({
    where: { shop_orderId: { shop, orderId: id } },
  }))!;
  assert.equal(before.refundCents, 0);
  let currency = "USD";
  const admin: AdminClient = {
    graphql: async () =>
      Response.json({
        data: {
          order: {
            totalRefundedSet: {
              shopMoney: { amount: "32.15", currencyCode: currency },
            },
          },
        },
      }),
  };
  await reconcileRefund(db, admin, shop, id);
  assert.equal(
    (await db.abOrder.findUnique({ where: { id: before.id } }))?.refundCents,
    3215,
  );
  currency = "EUR";
  await reconcileRefund(db, admin, shop, id);
  assert.equal(
    (await db.abOrder.findUnique({ where: { id: before.id } }))?.refundCents,
    3215,
  );
});
