import type { PrismaClient } from "@prisma/client";
import { createAbStore } from "./ab-store.server";
import { parseSetup } from "./ab-input";
import {
  context,
  ensureDiscount,
  existingDiscounts,
  expireDiscount,
  extendDiscount,
  setDiscount,
  validateTargets,
} from "./ab-shopify.server";
import type { AdminClient, Discounts } from "./ab-shopify.server";
import type { VariantKey } from "./experiments";

export const AB_SCOPES = [
  "read_products",
  "read_inventory",
  "read_orders",
  "write_discounts",
  "write_app_proxy",
];
const includeTestOrders = () => process.env.AB_INCLUDE_TEST_ORDERS === "true";
export function createAbService(db: PrismaClient) {
  const abStore = createAbStore(db);
  async function reconcile(shop: string, now = new Date()) {
    const active = await db.abExperiment.findMany({
      where: { shop, status: "Active" },
    });
    for (const t of active) {
      const setup = parseSetup(JSON.parse(t.setup));
      if (
        t.startedAt &&
        now.getTime() >= t.startedAt.getTime() + setup.minimumDays * 86400000
      ) {
        await db.abExperiment.updateMany({
          where: { id: t.id, shop, status: "Active", version: t.version },
          data: {
            status: "Ended",
            endedAt: new Date(
              t.startedAt.getTime() + setup.minimumDays * 86400000,
            ),
            version: { increment: 1 },
          },
        });
      }
    }
    // Keep the attribution slot reserved while late purchases can still arrive.
    await db.abExperiment.updateMany({
      where: {
        shop,
        status: "Ended",
        rolloutVariant: null,
        operationAt: null,
        endedAt: { lt: new Date(now.getTime() - 7 * 86400000) },
      },
      data: { activeTargetKey: null },
    });
    await db.abExperiment.updateMany({
      where: { shop, rolloutUntil: { lte: now } },
      data: {
        rolloutVariant: null,
        rolloutUntil: null,
        activeTargetKey: null,
        version: { increment: 1 },
      },
    });
  }
  async function workspace(shop: string, admin: AdminClient) {
    await reconcile(shop);
    const info = await context(admin);
    const scopes = info.currentAppInstallation.accessScopes.map(
      (s) => s.handle,
    );
    const requiredPlan = process.env.AB_REQUIRED_SUBSCRIPTION_NAME;
    const planEligible =
      !requiredPlan ||
      info.currentAppInstallation.activeSubscriptions.some(
        (s) => s.status === "ACTIVE" && s.name === requiredPlan,
      );
    const privacyRequests = (
      await db.abAudit.findMany({
        where: { shop, action: "privacy_data_request" },
        orderBy: { createdAt: "desc" },
        take: 50,
      })
    ).map((row) => ({
      createdAt: row.createdAt.toISOString(),
      data: JSON.parse(row.detail) as unknown,
    }));
    return {
      privacyRequests,
      tests: await abStore.list(shop, includeTestOrders()),
      shop,
      currency: info.shop.currencyCode,
      storefrontUrl: info.shop.primaryDomain.url,
      products: info.products.nodes.filter((p) => p.publishedAt),
      missingScopes: AB_SCOPES.filter(
        (s) =>
          !scopes.includes(s) &&
          !(s === "read_products" && scopes.includes("write_products")),
      ),
      planEligible,
      testOrdersIncluded: includeTestOrders(),
      enabled: process.env.AB_LIVE_ENABLED === "true",
    };
  }
  async function mutate(
    shop: string,
    admin: AdminClient,
    intent: string,
    payload: Record<string, unknown>,
  ) {
    if (intent === "save") {
      const setup = parseSetup(payload.setup, true);
      const info = await context(admin);
      if (setup.currency !== info.shop.currencyCode)
        throw new Error(
          "Use the store currency for consistent revenue and discount measurement.",
        );
      await validateTargets(admin, setup);
      await abStore.save(
        shop,
        setup,
        typeof payload.id === "string" ? payload.id : undefined,
        Number(payload.version),
      );
    } else {
      const id = String(payload.id || "");
      const version = Number(payload.version);
      if (!Number.isInteger(version))
        throw new Error("Refresh this test before changing it.");
      const t = await abStore.requireTest(shop, id);
      if (t.version !== version)
        throw new Error(
          "This test changed in another session. Refresh and try again.",
        );
      if (intent === "archive" || intent === "restore") {
        if (
          !["Draft", "Ended"].includes(t.status) ||
          t.rolloutVariant ||
          t.operationAt
        )
          throw new Error(
            "End the test and complete rollout cleanup before archiving.",
          );
        await abStore.change(
          shop,
          id,
          version,
          { archived: intent === "archive" },
          ["Draft", "Ended"],
        );
      } else if (intent === "start" || intent === "resume") {
        const info = await workspace(shop, admin);
        if (!info.enabled)
          throw new Error(
            "Live delivery is disabled until your development-store end-to-end checks are complete (AB_LIVE_ENABLED).",
          );
        if (info.missingScopes.length)
          throw new Error(
            `Approve the required app permissions first: ${info.missingScopes.join(", ")}.`,
          );
        if (!info.planEligible)
          throw new Error(
            "Your current app plan does not include A/B testing.",
          );
        if (t.archived || !["Draft", "Paused", "Starting"].includes(t.status))
          throw new Error("Only a draft or paused test can start.");
        if (
          t.status === "Starting" &&
          t.operationAt &&
          Date.now() - t.operationAt.getTime() < 300000
        )
          throw new Error(
            "Discount setup is still in progress. Wait a few minutes before retrying.",
          );
        const setup = parseSetup(JSON.parse(t.setup), true);
        await validateTargets(admin, setup);
        const start = t.startedAt || new Date();
        if (
          t.startedAt &&
          Date.now() >= start.getTime() + setup.minimumDays * 86400000
        )
          throw new Error(
            "The planned duration has elapsed. End this test and duplicate it for a new run.",
          );
        let reserved;
        try {
          reserved = await abStore.change(
            shop,
            id,
            version,
            {
              status: "Starting",
              activeTargetKey: "storefront",
              operationAt: new Date(),
            },
            ["Draft", "Paused", "Starting"],
          );
        } catch {
          throw new Error(
            "This test changed or another test/rollout owns this storefront. End it and wait for its 7-day attribution window, or stop the rollout.",
          );
        }
        const discounts: Discounts = JSON.parse(reserved.discounts);
        try {
          for (const key of ["A", "B"] as const) {
            const discount = await ensureDiscount(admin, id, setup, key, start);
            if (discount) discounts[key] = discount;
            await db.abExperiment.update({
              where: { id },
              data: { discounts: JSON.stringify(discounts) },
            });
          }
          await abStore.change(
            shop,
            id,
            reserved.version,
            { status: "Active", startedAt: start, operationAt: null },
            ["Starting"],
          );
        } catch (error) {
          const failures = await Promise.allSettled(
            Object.values(discounts).map((d) => setDiscount(admin, d, false)),
          );
          await db.abExperiment.update({
            where: { id },
            data: {
              status: "Paused",
              activeTargetKey: "storefront",
              operationAt: null,
              version: { increment: 1 },
            },
          });
          await abStore.audit(
            shop,
            id,
            "start_failed",
            failures.some((f) => f.status === "rejected")
              ? "Some native discounts require cleanup. Retry or end this test."
              : "Native discount setup did not complete.",
          );
          throw error;
        }
      } else if (intent === "pause") {
        // Stop new assignment immediately. Existing checkouts retain their offer.
        await abStore.change(shop, id, version, { status: "Paused" }, [
          "Active",
        ]);
      } else if (intent === "end") {
        const selected = payload.selectedVariant;
        if (selected !== null && selected !== "A" && selected !== "B")
          throw new Error("Choose A, B or no selection.");
        if (
          t.status === "Ending" &&
          t.operationAt &&
          Date.now() - t.operationAt.getTime() < 300000
        )
          throw new Error(
            "Ending is still in progress. Wait five minutes before retrying.",
          );
        const endedAt = new Date();
        const reserved = await abStore.change(
          shop,
          id,
          version,
          { status: "Ending", operationAt: endedAt },
          ["Active", "Paused", "Ending"],
        );
        try {
          const discounts: Discounts = t.startedAt
            ? JSON.parse(t.discounts)
            : await existingDiscounts(
                admin,
                id,
                parseSetup(JSON.parse(t.setup)),
              );
          for (const discount of Object.values(discounts)) {
            if (t.startedAt)
              await expireDiscount(
                admin,
                discount,
                new Date(endedAt.getTime() + 7 * 86400000),
              );
            else await setDiscount(admin, discount, false);
          }
          await abStore.change(
            shop,
            id,
            reserved.version,
            {
              status: "Ended",
              endedAt,
              operationAt: null,
              selectedVariant: selected,
              activeTargetKey: t.startedAt ? "storefront" : null,
            },
            ["Ending"],
          );
        } catch (error) {
          await db.abExperiment.updateMany({
            where: { id, shop, version: reserved.version, status: "Ending" },
            data: {
              status: "Paused",
              operationAt: null,
              version: { increment: 1 },
            },
          });
          await abStore.audit(
            shop,
            id,
            "end_failed",
            "Delivery paused. Refresh and retry ending or resume to restore the scheduled discounts.",
          );
          throw error;
        }
      } else if (intent === "rollout") {
        if (t.status !== "Ended" || t.archived)
          throw new Error("End the test before applying a version.");
        if (payload.variant !== "A" && payload.variant !== "B")
          throw new Error("Select a version to apply.");
        if (payload.acknowledged !== true)
          throw new Error("Review and acknowledge the storefront rollout.");
        if (process.env.AB_LIVE_ENABLED !== "true")
          throw new Error("Live delivery is disabled.");
        if (!t.endedAt || Date.now() < t.endedAt.getTime() + 7 * 86400000)
          throw new Error(
            "Wait for the 7-day attribution window after ending before applying a version. Existing checkout results must mature first.",
          );
        const info = await workspace(shop, admin);
        if (info.missingScopes.length || !info.planEligible)
          throw new Error(
            "Restore the required permissions and eligible app plan before applying a version.",
          );
        if (t.operationAt && Date.now() - t.operationAt.getTime() < 300000)
          throw new Error(
            "A rollout operation is still in progress. Wait before retrying.",
          );
        const discounts: Discounts = JSON.parse(t.discounts);
        // Reserve the delivery slot before making remote changes.
        const reserved = await abStore.change(
          shop,
          id,
          version,
          {
            activeTargetKey: "storefront",
            rolloutVariant: null,
            rolloutUntil: null,
            operationAt: new Date(),
          },
          ["Ended"],
        );
        const selected = payload.variant as VariantKey;
        const rolloutUntil = new Date(Date.now() + 30 * 86400000);
        for (const [key, discount] of Object.entries(discounts)) {
          if (key === selected)
            await extendDiscount(admin, discount, rolloutUntil);
          else await setDiscount(admin, discount, false);
        }
        await abStore.change(
          shop,
          id,
          reserved.version,
          {
            rolloutVariant: selected,
            selectedVariant: selected,
            rolloutUntil,
            operationAt: null,
          },
          ["Ended"],
        );
      } else if (intent === "stop-rollout") {
        if (t.operationAt && Date.now() - t.operationAt.getTime() < 300000)
          throw new Error(
            "An operation is still in progress. Wait five minutes before retrying cleanup.",
          );
        const discounts: Discounts = JSON.parse(t.discounts);
        // Hide delivery immediately but retain ownership until remote cleanup succeeds.
        const reserved = await abStore.change(
          shop,
          id,
          version,
          { rolloutVariant: null, rolloutUntil: null, operationAt: new Date() },
          ["Ended"],
        );
        for (const discount of Object.values(discounts))
          await setDiscount(admin, discount, false);
        await abStore.change(
          shop,
          id,
          reserved.version,
          { activeTargetKey: null, operationAt: null },
          ["Ended"],
        );
      } else throw new Error("Unsupported test action.");
      await abStore.audit(shop, id, intent);
    }
    return abStore.list(shop, includeTestOrders());
  }

  return { abStore, reconcile, workspace, mutate };
}
