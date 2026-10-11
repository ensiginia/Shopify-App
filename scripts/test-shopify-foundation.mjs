import assert from "node:assert/strict";
import { build } from "esbuild";
import { PrismaClient } from "@prisma/client";
import fs from "node:fs/promises";

await fs.mkdir("work", { recursive: true });
const files = ["work/cart-foundation-test.mjs", "work/privacy-foundation-test.mjs"];
await build({ entryPoints: ["app/lib/cart-draft.server.ts"], outfile: files[0], bundle: true, format: "esm", platform: "node", packages: "external" });
await build({ entryPoints: ["app/lib/shop-data.server.ts"], outfile: files[1], bundle: true, format: "esm", platform: "node", packages: "external" });
const { cartDraft, saveCartDraft } = await import("../" + files[0]);
const { eraseShopData } = await import("../" + files[1]);
const db = new PrismaClient();
const shop = `foundation-${Date.now()}.myshopify.com`, other = `other-${shop}`;
try {
  assert.deepEqual(await cartDraft(shop), { config: null, version: 0 });
  const config = { name: "My cart", position: "right", bodyOrder: ["items"] };
  assert.equal((await saveCartDraft(shop, { config, version: 0 })).version, 1);
  assert.deepEqual((await cartDraft(shop)).config, config);
  assert.equal((await cartDraft(other)).config, null);
  await assert.rejects(saveCartDraft(shop, { config, version: 0 }), /changed/);
  assert.equal((await saveCartDraft(shop, { config: { ...config, name: "Updated" }, version: 1 })).version, 2);
  await assert.rejects(saveCartDraft(other, { config: [], version: 0 }), /Invalid/);
  await assert.rejects(saveCartDraft(other, { config: { ...config, position: "bad" }, version: 0 }), /Invalid/);
  await assert.rejects(saveCartDraft(other, { config: { ...config, css: "x".repeat(200001) }, version: 0 }), /large/);
  await saveCartDraft(other, { config, version: 0 });
  await db.resourceEntry.create({ data: { shop, kind: "support", title: "Contact", body: '{"email":"test@example.invalid"}' } });
  await db.aiAccount.create({ data: { shop } });
  await db.aiPage.create({ data: { id: shop, shop, setup: "{}", content: "{}", revisions: { create: { version: 1, content: "{}" } } } });
  await db.aiGeneration.create({ data: { id: shop, shop, pageId: shop, requestKey: shop } });
  await db.aiImage.create({ data: { id: shop, shop, pageId: shop, data: "{}" } });
  await db.session.create({ data: { id: shop, shop, state: "test", accessToken: "test-only-token" } });
  await eraseShopData(shop);
  for (const model of ["resourceEntry", "aiAccount", "aiPage", "aiGeneration", "aiImage", "session"]) assert.equal(await db[model].count({ where: { shop } }), 0);
  assert.equal(await db.aiRevision.count({ where: { pageId: shop } }), 0);
  assert.equal((await cartDraft(other)).version, 1);
  await eraseShopData(shop);
  console.log("Shopify foundation passed: persistent cart drafts, store isolation, concurrent-save protection, validation, complete atomic shop erasure, cascades, idempotence.");
} finally {
  await eraseShopData(shop);
  await eraseShopData(other);
  await db.$disconnect();
  await Promise.all(files.map(file => fs.unlink(file)));
}
