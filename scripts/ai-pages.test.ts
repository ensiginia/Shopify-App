import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { createAIService } from "../app/lib/ai-service-core.server";
import {
  DEFAULT_BRAND,
  blankContent,
  validateContent,
  validateSetup,
  safeUrl,
  validateBrand,
} from "../app/lib/ai-pages";
import { resolveBrand, creditQuote, STYLE_PRESETS } from "../app/lib/ai-page-options";
import type { PageSetup, PageContent } from "../app/lib/ai-pages";
import {
  parseTemplate,
  templateFor,
  themeFiles,
  zipFiles,
} from "../app/lib/ai-export";
import { generatePage } from "../app/lib/ai-provider.server";
import { generateImage } from "../app/lib/ai-image-provider.server";
import { productFacts } from "../app/lib/ai-shopify.server";
import type { AdminClient } from "../app/lib/ab-shopify.server";
const dir = mkdtempSync(resolve("node_modules/.cache/ai-db-"));
const db = new PrismaClient({
  datasourceUrl: "file:" + join(dir, "test.sqlite").replaceAll("\\", "/"),
});
const setup = (kind: PageSetup["kind"] = "page"): PageSetup => ({
  kind,
  mode: "full",
  title: "Test page",
  prompt: "An honest welcome",
  themeId: "",
  sourceTemplate: "",
  keepSections: false,
  target: "any",
  targetId: "",
  targetTitle: "",
  language: "English",
  style: "Minimal",
});
const service = createAIService(db, {
  ready: () => true,
  generate: async (s) => ({ ...blankContent(s), title: "Generated page" }),
});
let sequence = 0;
async function create(
  shop = "shop" + ++sequence,
  s = setup(),
  api = service,
  admin?: AdminClient,
) {
  const ws = await api.command(shop, admin, "create", { setup: s });
  return { shop, page: ws.pages[0] };
}
before(async () => {
  for (const migration of [
    "20261010150000_ai_pages",
    "20261010151000_ai_images",
  ]) {
    const sql = readFileSync(
      "prisma/migrations/" + migration + "/migration.sql",
      "utf8",
    ).replace(/^\uFEFF/, "");
    for (const statement of sql.split(";").filter((s) => s.trim()))
      await db.$executeRawUnsafe(statement);
  }
});
after(async () => {
  await db.$disconnect();
});
test("tenant isolation and brand storage", async () => {
  const { shop, page } = await create();
  await assert.rejects(
    service.command("other", undefined, "save", {
      id: page.id,
      version: 1,
      content: page.content,
    }),
    /not found/,
  );
  await service.command(shop, undefined, "brand", {
    brand: { ...DEFAULT_BRAND, name: "Our brand", color: "#224433" },
  });
  const ws = await service.workspace(shop);
  assert.equal(ws.brand.name, "Our brand");
  assert.equal((await service.workspace("other")).brand.name, "");
});
test("preset preference persists without replacing store brand colors and affects exported palette", async () => {
  const { shop, page } = await create();
  await service.command(shop, undefined, "brand", {brand:{...DEFAULT_BRAND,color:"#224433",inspiration:"spacegoods",colorSource:"store"}});
  const store = (await service.workspace(shop)).brand;
  assert.equal(store.inspiration,"spacegoods");
  assert.equal(resolveBrand(store).color,"#224433");
  assert.equal(resolveBrand(store).style,"Bold");
  await service.command(shop, undefined, "brand", {brand:{...store,colorSource:"preset"}});
  const preset = (await service.workspace(shop)).brand;
  assert.equal(preset.color,"#224433");
  const output = templateFor(page.setup,page.content,preset);
  const settings = (Object.values(output.sections)[0] as {settings:{ink:string}}).settings;
  assert.equal(settings.ink,STYLE_PRESETS.spacegoods.color);
  assert.equal(resolveBrand({...preset,inspiration:"store"}).color,"#224433");
  assert.throws(() => validateBrand({...store,inspiration:"unknown"}),/preset/);
  assert.throws(() => validateBrand({...store,colorSource:"unknown"}),/color source/);
});
test("credit estimates match observed reference tiers and clamp invalid quantities", () => {
  for (const [quantity,percent,total] of [[5,0,500],[10,6,940],[25,11,2225],[50,17,4150],[75,21,5925],[100,25,7500]]) {
    const quote=creditQuote(quantity);
    assert.equal(quote.percent,percent);
    assert.equal(quote.total,total);
    assert.equal(quote.total+quote.discount,quote.subtotal);
  }
  assert.equal(creditQuote(-10).quantity,5);
  assert.equal(creditQuote(200).quantity,100);
  assert.equal(creditQuote(NaN).quantity,50);
  assert.equal(creditQuote(26).quantity,25);
});
test("optimistic save rejects a stale tab and undo restores stored content", async () => {
  const { shop, page } = await create();
  let ws = await service.command(shop, undefined, "save", {
    id: page.id,
    version: 1,
    content: { ...page.content, title: "Edited" },
  });
  await assert.rejects(
    service.command(shop, undefined, "save", {
      id: page.id,
      version: 1,
      content: page.content,
    }),
    /changed/,
  );
  ws = await service.command(shop, undefined, "undo", {
    id: page.id,
    version: ws.pages[0].version,
  });
  assert.equal(ws.pages[0].content.title, page.content.title);
  assert.equal(ws.pages[0].version, 3);
});
test("real generation path reserves exactly one credit and duplicate request is idempotent", async () => {
  const { shop, page } = await create(),
    key = "idempotent_request_123";
  let ws = await service.command(shop, undefined, "generate", {
    id: page.id,
    version: 1,
    requestKey: key,
  });
  assert.equal(ws.balance, 4);
  assert.equal(ws.pages[0].status, "ready");
  assert.equal(ws.pages[0].content.title, "Generated page");
  ws = await service.command(shop, undefined, "generate", {
    id: page.id,
    version: 2,
    requestKey: key,
  });
  assert.equal(ws.balance, 4);
  assert.equal(ws.pages[0].version, 2);
});
test("provider failure returns a credit once and retains the existing draft", async () => {
  const failing = createAIService(db, {
    ready: () => true,
    generate: async () => {
      throw new Error("Provider failed");
    },
  });
  const { shop, page } = await create(undefined, setup(), failing);
  const ws = await failing.command(shop, undefined, "generate", {
    id: page.id,
    version: 1,
    requestKey: "failure_request_123",
  });
  assert.equal(ws.balance, 5);
  assert.equal(ws.pages[0].status, "failed");
  assert.equal(ws.pages[0].content.title, "Test page");
  const job = await db.aiGeneration.findFirst({ where: { shop } });
  await failing.settle(job!.id, false);
  assert.equal((await failing.workspace(shop)).balance, 5);
});
test("cancel protects content from a late provider response", async () => {
  let complete!: (c: PageContent) => void, started!: () => void;
  const entered = new Promise<void>((r) => {
    started = r;
  });
  const slow = createAIService(db, {
    ready: () => true,
    generate: async () => {
      started();
      return new Promise((r) => {
        complete = r;
      });
    },
  });
  const { shop, page } = await create(undefined, setup(), slow);
  const running = slow.command(shop, undefined, "generate", {
    id: page.id,
    version: 1,
    requestKey: "cancel_request_123",
  });
  await entered;
  const canceled = await slow.command(shop, undefined, "cancel", {
    id: page.id,
    version: 1,
  });
  assert.equal(canceled.balance, 5);
  complete({ ...page.content, title: "Late result" });
  await running;
  const ws = await slow.workspace(shop);
  assert.equal(ws.pages[0].content.title, "Test page");
  assert.equal(ws.balance, 5);
  assert.equal(ws.pages[0].status, "draft");
});
test("restart recovery refunds abandoned work", async () => {
  const { shop, page } = await create();
  await db.aiAccount.update({ where: { shop }, data: { balance: 4 } });
  await db.aiGeneration.create({
    data: {
      id: "stale-" + shop,
      shop,
      pageId: page.id,
      requestKey: "stale-request",
      createdAt: new Date(Date.now() - 180000),
    },
  });
  await db.aiPage.update({
    where: { id: page.id },
    data: { status: "generating", operationAt: new Date(Date.now() - 180000) },
  });
  const ws = await service.workspace(shop);
  assert.equal(ws.balance, 5);
  assert.equal(ws.pages[0].status, "failed");
  await service.recover(shop);
  assert.equal((await service.workspace(shop)).balance, 5);
});
test("empty credit balance never starts provider work", async () => {
  const { shop, page } = await create();
  await db.aiAccount.update({ where: { shop }, data: { balance: 0 } });
  await assert.rejects(
    service.command(shop, undefined, "generate", {
      id: page.id,
      version: 1,
      requestKey: "empty_balance_123",
    }),
    /credits/,
  );
  assert.equal((await service.workspace(shop)).pages[0].status, "draft");
});
test("duplicate retains content and has an independent identifier", async () => {
  const { shop, page } = await create();
  const ws = await service.command(shop, undefined, "duplicate", {
    id: page.id,
    version: 1,
  });
  assert.equal(ws.pages.length, 2);
  assert.notEqual(ws.pages[0].id, ws.pages[1].id);
  await service.command(shop, undefined, "delete", { id: page.id, version: 1 });
  assert.equal((await service.workspace(shop)).pages.length, 1);
});
test("links reject executable and protocol-relative content", () => {
  assert.throws(() => safeUrl("javascript:alert(1)"), /secure/);
  assert.throws(() => safeUrl("//evil.test"), /secure/);
  assert.throws(() => safeUrl("https://user:pass@test.com"), /secure/);
  assert.equal(safeUrl("/collections/all"), "/collections/all");
  assert.throws(
    () => validateContent({ title: "X", seoDescription: "", sections: [] }),
    /1–12/,
  );
  assert.throws(
    () => validateSetup({ ...setup(), sourceTemplate: "../../sessions" }),
    /template/,
  );
});
test("buy-box and sections-only templates preserve intended theme sections", () => {
  const source = parseTemplate(
    '/* Shopify comment */{"sections":{"main":{"type":"main-product","settings":{}},"related":{"type":"related-products"}},"order":["main","related"]}',
  );
  const s = {
      ...setup("product"),
      sourceTemplate: "templates/product.json",
      mode: "buy-box" as const,
    },
    content = blankContent(s);
  const result = templateFor(s, content, DEFAULT_BRAND, source);
  assert.equal(result.order.length, 2);
  assert.equal(result.order[1], "related");
  assert.deepEqual(result.sections.related, source.sections.related);
  assert.equal(result.sections.main, undefined);
  const only = { ...s, mode: "sections" as const },
    text = {
      ...blankContent(only),
      sections: [{ ...content.sections[0], kind: "text" as const }],
    };
  const below = templateFor(only, text, DEFAULT_BRAND, source);
  assert.deepEqual(below.order.slice(0, 2), ["main", "related"]);
  assert.throws(() => templateFor(only, text, DEFAULT_BRAND), /source/);
});
test("downloaded theme ZIP is readable by a standard zip implementation", async () => {
  const files = themeFiles(
      "export1",
      setup(),
      blankContent(setup()),
      DEFAULT_BRAND,
    ),
    zip = zipFiles({ ...files, "assets/test.bin": Uint8Array.of(1, 2, 3) });
  const path = join(dir, "page.zip");
  writeFileSync(path, zip);
  const { spawnSync } = await import("node:child_process");
  const result = spawnSync(
    "python",
    [
      "-c",
      "import sys,zipfile; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; assert z.read('assets/test.bin') == bytes([1,2,3]); assert 'sections/aip-page.liquid' in z.namelist()",
      path,
    ],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
});
test("OpenAI adapter sends strict schema and rejects incomplete or fabricated image output", async () => {
  const key = process.env.OPENAI_API_KEY,
    model = process.env.AI_MODEL;
  process.env.OPENAI_API_KEY = "test-placeholder";
  process.env.AI_MODEL = "test-model";
  try {
    let request: Record<string, unknown> = {};
    const response = blankContent(setup());
    const fake = (async (_url, init) => {
      request = JSON.parse(String(init?.body));
      return Response.json({
        status: "completed",
        output: [
          {
            content: [{ type: "output_text", text: JSON.stringify(response) }],
          },
        ],
      });
    }) as typeof fetch;
    assert.deepEqual(
      await generatePage(
        setup(),
        DEFAULT_BRAND,
        [],
        undefined,
        undefined,
        fake,
      ),
      response,
    );
    assert.equal(request.store, false);
    assert.equal(
      (request.text as { format: { strict: boolean } }).format.strict,
      true,
    );
    const incomplete = (async () =>
      Response.json({ status: "incomplete", output: [] })) as typeof fetch;
    await assert.rejects(
      generatePage(
        setup(),
        DEFAULT_BRAND,
        [],
        undefined,
        undefined,
        incomplete,
      ),
      /incomplete/,
    );
    response.sections[0].image = "https://invented.example/image.png";
    await assert.rejects(
      generatePage(setup(), DEFAULT_BRAND, [], undefined, undefined, fake),
      /outside/,
    );
  } finally {
    if (key === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = key;
    if (model === undefined) delete process.env.AI_MODEL;
    else process.env.AI_MODEL = model;
  }
});
test("image adapter rejects a non-PNG provider response", async () => {
  const key = process.env.OPENAI_API_KEY,
    model = process.env.AI_IMAGE_MODEL;
  process.env.OPENAI_API_KEY = "test-placeholder";
  process.env.AI_IMAGE_MODEL = "test-image-model";
  try {
    await assert.rejects(
      generateImage("A botanical illustration", (async () =>
        Response.json({
          data: [{ b64_json: Buffer.from("not an image").toString("base64") }],
        })) as typeof fetch),
      /format/,
    );
  } finally {
    if (key === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = key;
    if (model === undefined) delete process.env.AI_IMAGE_MODEL;
    else process.env.AI_IMAGE_MODEL = model;
  }
});
function shopifyMock() {
  const themeId = "gid://shopify/OnlineStoreTheme/100",
    files: Record<string, string> = {
      "templates/index.json":
        '{"sections":{"old":{"type":"text"}},"order":["old"]}',
    };
  const product = {
    id: "gid://shopify/Product/200",
    title: "Actual product",
    handle: "product",
    description: "Cotton",
    templateSuffix: "original",
    featuredImage: null,
  };
  let page: {
      id: string;
      handle: string;
      isPublished: boolean;
      templateSuffix: string;
    } | null = null,
    createCount = 0;
  const scopes = [
    "read_themes",
    "write_themes",
    "write_content",
    "write_products",
  ];
  const admin: AdminClient = {
    async graphql(query, options) {
      const v = options?.variables || {};
      let data: unknown;
      if (query.includes("query AIContext"))
        data = {
          shop: {
            name: "Test",
            primaryDomain: { url: "https://test.myshopify.com" },
          },
          currentAppInstallation: {
            accessScopes: scopes.map((handle) => ({ handle })),
          },
        };
      else if (query.includes("query AIThemes"))
        data = {
          themes: { nodes: [{ id: themeId, name: "Live", role: "MAIN" }] },
        };
      else if (query.includes("query AIFile"))
        data = {
          theme: {
            id: themeId,
            name: "Live",
            role: "MAIN",
            files: {
              nodes: (v.filenames as string[])
                .filter((f) => files[f])
                .map((filename) => ({
                  filename,
                  body: { content: files[filename] },
                })),
            },
          },
        };
      else if (query.includes("mutation AIUpsert")) {
        for (const f of v.files as {
          filename: string;
          body: { value: string };
        }[])
          files[f.filename] = f.body.value;
        data = { themeFilesUpsert: { job: null, userErrors: [] } };
      } else if (query.includes("query AIProduct")) data = { product };
      else if (query.includes("mutation AIAssign")) {
        product.templateSuffix = (
          v.product as { templateSuffix: string }
        ).templateSuffix;
        data = { productUpdate: { product, userErrors: [] } };
      } else if (query.includes("mutation AICreatePage")) {
        createCount++;
        page = {
          ...(v.page as typeof page & object),
          id: "gid://shopify/Page/300",
        } as NonNullable<typeof page>;
        data = { pageCreate: { page, userErrors: [] } };
      } else if (query.includes("mutation AIUpdatePage")) {
        Object.assign(page!, v.page);
        data = { pageUpdate: { page, userErrors: [] } };
      } else if (query.includes("query AIReadPage")) data = { page };
      else throw new Error("Unexpected query " + query.slice(0, 80));
      return Response.json({ data });
    },
  };
  return {
    admin,
    files,
    themeId,
    product,
    getPage: () => page,
    createCount: () => createCount,
  };
}
test("home upload is isolated; activation backs up home and restore protects external edits", async () => {
  const mock = shopifyMock(),
    api = createAIService(db, { ready: () => true, themeWrites: () => true });
  const { shop, page } = await create(
      undefined,
      { ...setup("home"), themeId: mock.themeId },
      api,
      mock.admin,
    ),
    old = mock.files["templates/index.json"];
  let ws = await api.command(shop, mock.admin, "deploy", {
    id: page.id,
    version: 1,
  });
  assert.equal(mock.files["templates/index.json"], old);
  assert.equal(ws.pages[0].status, "deployed");
  ws = await api.command(shop, mock.admin, "activate", {
    id: page.id,
    version: 1,
  });
  assert.equal(ws.pages[0].status, "published");
  assert.notEqual(mock.files["templates/index.json"], old);
  mock.files["templates/index.json"] = "external-edit";
  await assert.rejects(
    api.command(shop, mock.admin, "restore", { id: page.id, version: 1 }),
    /changed after/,
  );
  assert.equal(mock.files["templates/index.json"], "external-edit");
  const record = await db.aiPage.findUnique({ where: { id: page.id } });
  mock.files["templates/index.json"] = JSON.parse(record!.deployment).homeAfter;
  ws = await api.command(shop, mock.admin, "restore", {
    id: page.id,
    version: 1,
  });
  assert.equal(mock.files["templates/index.json"], old);
  assert.equal(ws.pages[0].deployment.activated, false);
});
test("product assignment restores prior template suffix", async () => {
  const mock = shopifyMock(),
    api = createAIService(db, { themeWrites: () => true });
  const s = {
    ...setup("product"),
    themeId: mock.themeId,
    target: "product" as const,
    targetId: mock.product.id,
    targetTitle: mock.product.title,
  };
  const { shop, page } = await create(undefined, s, api, mock.admin);
  await api.command(shop, mock.admin, "deploy", { id: page.id, version: 1 });
  await api.command(shop, mock.admin, "activate", { id: page.id, version: 1 });
  assert.equal(mock.product.templateSuffix, "aip-" + page.id);
  await api.command(shop, mock.admin, "restore", { id: page.id, version: 1 });
  assert.equal(mock.product.templateSuffix, "original");
});
test("landing-page republish uses its existing page and unpublish restores visibility", async () => {
  const mock = shopifyMock(),
    api = createAIService(db, { themeWrites: () => true }),
    { shop, page } = await create(
      undefined,
      { ...setup(), themeId: mock.themeId },
      api,
      mock.admin,
    );
  await api.command(shop, mock.admin, "deploy", { id: page.id, version: 1 });
  await api.command(shop, mock.admin, "activate", { id: page.id, version: 1 });
  assert.equal(mock.getPage()?.isPublished, true);
  await api.command(shop, mock.admin, "restore", { id: page.id, version: 1 });
  assert.equal(mock.getPage()?.isPublished, false);
  await api.command(shop, mock.admin, "activate", { id: page.id, version: 1 });
  assert.equal(mock.createCount(), 1);
  assert.equal(mock.getPage()?.isPublished, true);
});
test("local workspace cannot perform Shopify writes", async () => {
  const { shop, page } = await create();
  await assert.rejects(
    service.command(shop, undefined, "deploy", { id: page.id, version: 1 }),
    /linked app/,
  );
});
test("generated banner is stored privately per tenant and included in theme export", async () => {
  const imageData =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=";
  const api = createAIService(db, {
    ready: () => true,
    imageReady: () => true,
    generateImage: async () => imageData,
  });
  const { shop, page } = await create(undefined, setup(), api);
  const ws = await api.command(shop, undefined, "image", {
    id: page.id,
    version: 1,
    sectionId: page.content.sections[0].id,
    prompt: "Original botanical illustration",
    requestKey: "image_request_123",
  });
  const url = ws.pages[0].content.sections[0].image;
  assert.match(url, /^\/__ai-image\?id=/);
  assert.equal(ws.balance, 4);
  const id = url.split("=")[1];
  assert.equal((await api.image(shop, id))?.data, imageData);
  assert.equal(await api.image("other", id), null);
  const bundle = await api.exportPage(shop, page.id);
  assert.equal(bundle["assets/aip-image-" + id + ".png"].type, "BASE64");
  const template = bundle["templates/page.aip-" + page.id + ".json"].value;
  assert.ok(template.includes("aip-image-" + id + ".png"));
  assert.ok(!template.includes("/__ai-image"));
});
test("a merchant cannot export another shop's generated image", async () => {
  const api = createAIService(db),
    { shop, page } = await create(undefined, setup(), api);
  const id = "a".repeat(32);
  await db.aiImage.create({
    data: { id, shop: "another", pageId: "other", data: "private" },
  });
  const content = {
    ...page.content,
    sections: page.content.sections.map((s) => ({
      ...s,
      image: "/__ai-image?id=" + id,
    })),
  };
  await api.command(shop, undefined, "save", {
    id: page.id,
    version: 1,
    content,
  });
  await assert.rejects(api.exportPage(shop, page.id), /unavailable/);
});

test("collection context is bounded for AI and assignment enumerates all products", async () => {
  const sizes: number[] = [];
  const admin: AdminClient = {
    async graphql(_query, options) {
      const first = Number(options?.variables?.first);
      sizes.push(first);
      const after = options?.variables?.after;
      const nodes = Array.from({ length: first }, (_, i) => ({
        id: "gid://shopify/Product/" + (after ? 100 + i : i),
        title: "Product",
        handle: "item",
        description: "Factual description",
        templateSuffix: null,
        featuredMedia: {
          preview: {
            image: {
              url: "https://cdn.shopify.com/image.png",
              altText: "Product",
            },
          },
        },
      }));
      return Response.json({
        data: {
          collection: {
            products: {
              nodes,
              pageInfo: { hasNextPage: !after, endCursor: "page2" },
            },
          },
        },
      });
    },
  };
  const context = await productFacts(
    admin,
    "collection",
    "gid://shopify/Collection/10",
  );
  assert.equal(context.length, 8);
  assert.equal(
    context[0].featuredImage?.url,
    "https://cdn.shopify.com/image.png",
  );
  const all = await productFacts(
    admin,
    "collection",
    "gid://shopify/Collection/10",
    true,
  );
  assert.equal(all.length, 200);
  assert.deepEqual(sizes, [8, 100, 100]);
});
