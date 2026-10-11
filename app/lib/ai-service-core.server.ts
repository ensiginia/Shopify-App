import { generateImage, imageProviderReady } from "./ai-image-provider.server";
import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import {
  DEFAULT_BRAND,
  blankContent,
  validateBrand,
  validateContent,
  validateSetup,
} from "./ai-pages";
import type {
  AIWorkspace,
  SavedPage,
  PageContent,
  PageSetup,
  Brand,
} from "./ai-pages";
import { parseTemplate, themeFiles } from "./ai-export";
import type { AdminClient } from "./ab-shopify.server";
import { graphql } from "./ab-shopify.server";
import { providerStatus, generatePage } from "./ai-provider.server";
import {
  AI_CONTEXT,
  AI_THEMES,
  AI_PAGE_CREATE,
  AI_PAGE_UPDATE,
  AI_READ_PAGE,
  productFacts,
  readFile,
  upsertFiles,
  assignProduct,
  userErrors,
} from "./ai-shopify.server";
type Deployment = {
  filename?: string;
  files?: Record<string, string>;
  source?: string;
  editorUrl?: string;
  previewUrl?: string;
  pageId?: string;
  handle?: string;
  activated?: boolean;
  homeBefore?: string;
  homeAfter?: string;
  products?: { id: string; before: string | null; applied: boolean }[];
  uncertain?: boolean;
  publishedVersion?: number;
};
type Options = {
  generate?: typeof generatePage;
  generateImage?: typeof generateImage;
  imageReady?: () => boolean;
  ready?: () => boolean;
  initialCredits?: number;
  themeWrites?: () => boolean;
};
export function createAIService(db: PrismaClient, options: Options = {}) {
  const generator = options.generate || generatePage;
  const imageGenerator = options.generateImage || generateImage;
  const imageReady = options.imageReady || imageProviderReady;
  const ready = options.ready || (() => providerStatus().providerReady);
  const writes =
    options.themeWrites ||
    (() => process.env.AI_THEME_WRITE_ENABLED === "true");
  const initial = Math.max(
    0,
    Math.min(
      1000,
      options.initialCredits ?? Number(process.env.AI_INITIAL_CREDITS || 5),
    ),
  );
  const requirePage = async (shop: string, id: unknown) => {
    if (typeof id !== "string") throw new Error("Select a saved page.");
    const page = await db.aiPage.findFirst({ where: { id, shop } });
    if (!page) throw new Error("Page not found.");
    return page;
  };
  const account = (shop: string) =>
    db.aiAccount.upsert({
      where: { shop },
      create: {
        shop,
        balance: Number.isFinite(initial) ? initial : 5,
        brand: JSON.stringify(DEFAULT_BRAND),
      },
      update: {},
    });
  async function settle(generationId: string, success: boolean) {
    await db.$transaction(async (tx) => {
      const job = await tx.aiGeneration.findUnique({
        where: { id: generationId },
      });
      if (!job) return;
      const claim = await tx.aiGeneration.updateMany({
        where: { id: generationId, status: "running" },
        data: { status: success ? "completed" : "failed", reserved: false },
      });
      if (claim.count && job.reserved && !success)
        await tx.aiAccount.update({
          where: { shop: job.shop },
          data: { balance: { increment: 1 } },
        });
    });
  }
  async function recover(shop: string) {
    const stale = await db.aiGeneration.findMany({
      where: {
        shop,
        status: "running",
        createdAt: { lt: new Date(Date.now() - 120000) },
      },
    });
    for (const job of stale) {
      await settle(job.id, false);
      await db.aiPage.updateMany({
        where: { id: job.pageId, shop, status: "generating" },
        data: {
          status: "failed",
          error:
            "Generation was interrupted. Your credit was returned; retry when ready.",
          operationAt: null,
        },
      });
    }
    await db.aiPage.updateMany({
      where: {
        shop,
        status: { in: ["deploying", "activating", "restoring"] },
        operationAt: { lt: new Date(Date.now() - 180000) },
      },
      data: {
        status: "attention",
        error:
          "A Shopify operation was interrupted. Verify the remote state or restore before retrying.",
        operationAt: null,
      },
    });
  }
  function dto(page: {
    id: string;
    setup: string;
    content: string;
    status: string;
    version: number;
    error: string;
    deployment: string;
    createdAt: Date;
    updatedAt: Date;
  }): SavedPage {
    const d = JSON.parse(page.deployment) as Deployment;
    return {
      id: page.id,
      setup: JSON.parse(page.setup),
      content: JSON.parse(page.content),
      status: page.status,
      version: page.version,
      error: page.error,
      createdAt: page.createdAt.toISOString(),
      updatedAt: page.updatedAt.toISOString(),
      deployment: {
        filename: d.filename,
        editorUrl: d.editorUrl,
        previewUrl: d.previewUrl,
        pageId: d.pageId,
        handle: d.handle,
        activated: d.activated,
      },
    };
  }
  async function workspace(
    shop: string,
    admin?: AdminClient,
  ): Promise<AIWorkspace> {
    await recover(shop);
    const a = await account(shop);
    let themes: AIWorkspace["themes"] = [],
      scopes: string[] = [],
      catalogError = "";
    if (admin) {
      try {
        const context = await graphql<{
          currentAppInstallation: { accessScopes: { handle: string }[] };
        }>(admin, AI_CONTEXT);
        scopes = context.currentAppInstallation.accessScopes.map(
          (s) => s.handle,
        );
        if (scopes.includes("read_themes") || scopes.includes("write_themes"))
          themes = (
            await graphql<{ themes: { nodes: AIWorkspace["themes"] } }>(
              admin,
              AI_THEMES,
            )
          ).themes.nodes.filter((t) => t.role !== "DEMO");
        else
          catalogError =
            "Grant theme access to select and analyze your Shopify theme.";
      } catch {
        catalogError =
          "Shopify theme information could not be loaded. Refresh or check app permissions.";
      }
    }
    return {
      pages: (
        await db.aiPage.findMany({
          where: { shop },
          orderBy: { updatedAt: "desc" },
          take: 100,
        })
      ).map(dto),
      brand: validateBrand({ ...DEFAULT_BRAND, ...JSON.parse(a.brand) }),
      balance: a.balance,
      providerReady: ready(),
      imageReady: imageReady(),
      provider: providerStatus().provider,
      themes,
      scopes,
      themeWrites: !!admin && writes() && scopes.includes("write_themes"),
      themeWriteApproved: writes(),
      catalogError,
      tutorialUrl: process.env.AI_TUTORIAL_URL || "",
      live: !!admin,
    };
  }
  async function command(
    shop: string,
    admin: AdminClient | undefined,
    intent: string,
    payload: Record<string, unknown>,
  ) {
    await account(shop);
    await recover(shop);
    if (intent === "import-brand") {
      if (
        !admin ||
        typeof payload.themeId !== "string" ||
        !/^gid:\/\/shopify\/OnlineStoreTheme\/\d+$/.test(payload.themeId)
      )
        throw new Error("Select your Shopify theme to import brand settings.");
      const file = await readFile(
        admin,
        payload.themeId,
        "config/settings_data.json",
      );
      if (!file.content) throw new Error("Theme settings were not found.");
      const settings = JSON.parse(
        file.content.replace(/^\s*\/\*[\s\S]*?\*\//, ""),
      );
      const current = settings.current || {};
      const scheme =
        (
          Object.values(current.color_schemes || {})[0] as {
            settings?: Record<string, string>;
          }
        )?.settings || {};
      const a = await account(shop),
        previous = validateBrand({ ...DEFAULT_BRAND, ...JSON.parse(a.brand) });
      const pick = (candidates: unknown[], fallback: string) =>
        (candidates.find(
          (c) => typeof c === "string" && /^#[a-f0-9]{6}$/i.test(c),
        ) as string) || fallback;
      const context = await graphql<{ shop: { name: string } }>(
        admin,
        AI_CONTEXT,
      );
      const next = {
        ...previous,
        name: context.shop.name,
        color: pick(
          [scheme.text, current.color_text, current.colors_text],
          previous.color,
        ),
        background: pick(
          [
            scheme.background,
            current.color_background,
            current.colors_background_1,
          ],
          previous.background,
        ),
      };
      await db.aiAccount.update({
        where: { shop },
        data: { brand: JSON.stringify(next) },
      });
      return workspace(shop, admin);
    }
    if (intent === "brand") {
      await db.aiAccount.update({
        where: { shop },
        data: { brand: JSON.stringify(validateBrand(payload.brand)) },
      });
      return workspace(shop, admin);
    }
    if (intent === "create") {
      const setup = validateSetup(payload.setup),
        id = randomUUID().replaceAll("-", "").slice(0, 24);
      const content = JSON.stringify(blankContent(setup));
      await db.aiPage.create({
        data: {
          id,
          shop,
          setup: JSON.stringify(setup),
          content,
          revisions: { create: { version: 1, content } },
        },
      });
      return workspace(shop, admin);
    }
    if (intent === "refresh") return workspace(shop, admin);
    const page = await requirePage(shop, payload.id),
      setup = validateSetup(JSON.parse(page.setup)),
      content = validateContent(JSON.parse(page.content));
    const locked = [
      "generating",
      "deploying",
      "activating",
      "restoring",
    ].includes(page.status);
    if (intent === "cancel" && page.status === "generating") {
      await db.aiPage.updateMany({
        where: { id: page.id, shop, status: "generating" },
        data: {
          status: "draft",
          error: "Generation canceled; your credit was returned.",
          operationAt: null,
        },
      });
      const jobs = await db.aiGeneration.findMany({
        where: { pageId: page.id, shop, status: "running" },
      });
      for (const job of jobs) await settle(job.id, false);
      return workspace(shop, admin);
    }
    if (locked)
      throw new Error("This page is busy. Refresh or cancel generation first.");
    if (payload.version !== page.version)
      throw new Error(
        "This page changed in another session. Refresh before continuing.",
      );
    if (intent === "configure") {
      if (JSON.parse(page.deployment).activated || page.status === "attention")
        throw new Error(
          "Restore or resolve this page before changing its settings.",
        );
      const next = validateSetup(payload.setup);
      await db.$transaction(async (tx) => {
        const changed = await tx.aiPage.updateMany({
          where: {
            id: page.id,
            shop,
            version: page.version,
            status: page.status,
          },
          data: {
            setup: JSON.stringify(next),
            status: "ready",
            version: { increment: 1 },
            error: "",
          },
        });
        if (!changed.count) throw new Error("Page changed. Refresh.");
        await tx.aiRevision.create({
          data: {
            pageId: page.id,
            version: page.version + 1,
            content: page.content,
          },
        });
      });
      return workspace(shop, admin);
    }
    if (intent === "save" || intent === "undo") {
      if (JSON.parse(page.deployment).activated || page.status === "attention")
        throw new Error(
          "Restore or resolve the deployed page before editing its saved content.",
        );
      let next = content;
      if (intent === "save") next = validateContent(payload.content);
      if (intent === "undo") {
        const previous = await db.aiRevision.findFirst({
          where: { pageId: page.id, version: { lt: page.version } },
          orderBy: { version: "desc" },
        });
        if (!previous) throw new Error("No previous saved revision.");
        next = validateContent(JSON.parse(previous.content));
      }
      await db.$transaction(async (tx) => {
        const changed = await tx.aiPage.updateMany({
          where: {
            id: page.id,
            shop,
            version: page.version,
            status: page.status,
          },
          data: {
            content: JSON.stringify(next),
            status: "ready",
            version: { increment: 1 },
            error: "",
          },
        });
        if (!changed.count) throw new Error("Page changed. Refresh.");
        await tx.aiRevision.create({
          data: {
            pageId: page.id,
            version: page.version + 1,
            content: JSON.stringify(next),
          },
        });
      });
      return workspace(shop, admin);
    }
    if (intent === "duplicate") {
      const id = randomUUID().replaceAll("-", "").slice(0, 24);
      await db.aiPage.create({
        data: {
          id,
          shop,
          setup: JSON.stringify({
            ...setup,
            title: setup.title.slice(0, 85) + " copy",
          }),
          content: page.content,
          status: "ready",
          revisions: { create: { version: 1, content: page.content } },
        },
      });
      return workspace(shop, admin);
    }
    if (intent === "delete") {
      if (Object.keys(JSON.parse(page.deployment)).length)
        throw new Error(
          "This page has a Shopify deployment. Keep its record for restore and recovery.",
        );
      await db.aiPage.deleteMany({
        where: {
          id: page.id,
          shop,
          version: page.version,
          status: page.status,
        },
      });
      return workspace(shop, admin);
    }
    if (
      intent === "generate" ||
      intent === "regenerate" ||
      intent === "image"
    ) {
      if (intent === "image" ? !imageReady() : !ready())
        throw new Error("Configure the AI provider on the server first.");
      if (JSON.parse(page.deployment).activated || page.status === "attention")
        throw new Error("Restore or resolve this page before regenerating.");
      const requestKey = String(payload.requestKey || "");
      if (!/^[a-zA-Z0-9_-]{12,80}$/.test(requestKey))
        throw new Error("Invalid generation request.");
      const prior = await db.aiGeneration.findUnique({
        where: { shop_requestKey: { shop, requestKey } },
      });
      if (prior) return workspace(shop, admin);
      const sectionId =
        intent === "regenerate" || intent === "image"
          ? String(payload.sectionId || "")
          : undefined;
      if (sectionId && !content.sections.some((s) => s.id === sectionId))
        throw new Error("Section not found.");
      if ((intent === "image" || intent === "regenerate") && !sectionId)
        throw new Error("Select a section first.");
      if (
        intent === "image" &&
        content.sections.find((s) => s.id === sectionId)?.kind === "product"
      )
        throw new Error(
          "Product buy boxes use your real Shopify product photos. Select a banner section for AI imagery.",
        );
      const facts =
        intent === "image"
          ? []
          : admin
            ? await productFacts(admin, setup.target, setup.targetId)
            : [];
      if (intent !== "image" && !admin && setup.target !== "any")
        throw new Error(
          "Connect your Shopify app to generate from real products.",
        );
      const jobId = randomUUID();
      await db.$transaction(async (tx) => {
        const claim = await tx.aiPage.updateMany({
          where: {
            id: page.id,
            shop,
            version: page.version,
            status: page.status,
          },
          data: { status: "generating", operationAt: new Date(), error: "" },
        });
        if (!claim.count) throw new Error("Page changed. Refresh.");
        const credit = await tx.aiAccount.updateMany({
          where: { shop, balance: { gt: 0 } },
          data: { balance: { decrement: 1 } },
        });
        if (!credit.count)
          throw new Error(
            "No AI credits remaining. Contact your app administrator.",
          );
        await tx.aiGeneration.create({
          data: { id: jobId, shop, pageId: page.id, requestKey },
        });
      });
      try {
        const a = await account(shop);
        let result: PageContent;
        if (intent === "image") {
          const data = await imageGenerator(String(payload.prompt || ""));
          const imageId = randomUUID().replaceAll("-", "");
          await db.aiImage.create({
            data: { id: imageId, shop, pageId: page.id, data },
          });
          const url =
            (admin ? "/app/ai-image" : "/__ai-image") + "?id=" + imageId;
          result = {
            ...content,
            sections: content.sections.map((s) =>
              s.id === sectionId
                ? {
                    ...s,
                    image: url,
                    imageAlt: String(payload.prompt || "").slice(0, 200),
                  }
                : s,
            ),
          };
        } else
          result = await generator(
            setup,
            validateBrand({ ...DEFAULT_BRAND, ...JSON.parse(a.brand) }),
            facts,
            sectionId ? content : undefined,
            sectionId,
          );
        await db.$transaction(async (tx) => {
          const job = await tx.aiGeneration.findUnique({
            where: { id: jobId },
          });
          if (job?.status !== "running") return;
          const changed = await tx.aiPage.updateMany({
            where: {
              id: page.id,
              shop,
              version: page.version,
              status: "generating",
            },
            data: {
              content: JSON.stringify(validateContent(result)),
              version: { increment: 1 },
              status: "ready",
              operationAt: null,
              error: "",
            },
          });
          if (!changed.count)
            throw new Error("Generation was canceled or superseded.");
          await tx.aiRevision.create({
            data: {
              pageId: page.id,
              version: page.version + 1,
              content: JSON.stringify(result),
            },
          });
          await tx.aiGeneration.update({
            where: { id: jobId },
            data: { status: "completed", reserved: false },
          });
        });
      } catch (error) {
        await settle(jobId, false);
        await db.aiPage.updateMany({
          where: {
            id: page.id,
            shop,
            status: "generating",
            version: page.version,
          },
          data: {
            status: "failed",
            operationAt: null,
            error:
              (error as Error).name === "TimeoutError"
                ? "AI generation timed out. Your credit was returned."
                : (error as Error).message.slice(0, 500),
          },
        });
      }
      return workspace(shop, admin);
    }
    if (!admin)
      throw new Error(
        "Shopify publishing requires your linked app. This local workspace supports drafts and exports.",
      );
    const ws = await workspace(shop, admin);
    if (!ws.themeWrites)
      throw new Error(
        "Enable approved theme-write access before publishing, or download the theme ZIP.",
      );
    if (!setup.themeId || !ws.themes.some((t) => t.id === setup.themeId))
      throw new Error("Choose an available Shopify theme.");
    const d = JSON.parse(page.deployment) as Deployment;
    if (!["deploy", "activate", "restore", "verify"].includes(intent))
      throw new Error("Unknown page action.");
    if (intent === "verify") {
      if (!d.files || !d.filename)
        throw new Error("There is no recorded upload to verify.");
      for (const [filename, expected] of Object.entries(d.files)) {
        const actual = await readFile(admin, setup.themeId, filename);
        if (actual.content !== expected)
          throw new Error(
            "The uploaded theme files differ. Review them in Shopify before retrying.",
          );
      }
      if (d.uncertain)
        throw new Error(
          "An activation may have partially completed. Use Restore to reconcile changed products or the home page.",
        );
      await db.aiPage.update({
        where: { id: page.id },
        data: {
          status: d.activated ? "published" : "deployed",
          error: "",
          operationAt: null,
        },
      });
      return workspace(shop, admin);
    }
    const claim = await db.aiPage.updateMany({
      where: { id: page.id, shop, version: page.version, status: page.status },
      data: {
        status:
          intent === "deploy"
            ? "deploying"
            : intent === "restore"
              ? "restoring"
              : "activating",
        operationAt: new Date(),
        error: "",
      },
    });
    if (!claim.count) throw new Error("Page changed. Refresh.");
    const persist = () =>
      db.aiPage.update({
        where: { id: page.id },
        data: { deployment: JSON.stringify(d), operationAt: new Date() },
      });
    try {
      if (intent === "deploy") {
        if (d.activated || page.status === "attention")
          throw new Error("Restore or verify this page first.");
        let source;
        if (
          setup.sourceTemplate &&
          (setup.keepSections || setup.mode !== "full")
        ) {
          const file = await readFile(
            admin,
            setup.themeId,
            setup.sourceTemplate,
          );
          if (!file.content) throw new Error("Source JSON template not found.");
          d.source = file.content;
          source = parseTemplate(file.content);
        }
        const a = await account(shop);
        const files = await makeFiles(
          shop,
          page.id,
          setup,
          content,
          validateBrand({ ...DEFAULT_BRAND, ...JSON.parse(a.brand) }),
          source,
        );
        // Own page namespace prevents changes to previously deployed pages.
        const type = "aip-page-" + page.id;
        const templateName = Object.keys(files).find((f) =>
          f.startsWith("templates/"),
        )!;
        const template = JSON.parse(files[templateName]);
        for (const section of Object.values(template.sections) as {
          type: string;
        }[])
          if (section.type === "aip-page") section.type = type;
        const privateFiles = {
          ["sections/" + type + ".liquid"]: files[
            "sections/aip-page.liquid"
          ].replaceAll("aip-pages.css", type + ".css"),
          ["assets/" + type + ".css"]: files["assets/aip-pages.css"],
          [templateName]: JSON.stringify(template, null, 2),
        };
        const imageAssets = await imageFiles(shop, content);
        for (const [filename, expected] of Object.entries(privateFiles)) {
          const existing = await readFile(admin, setup.themeId, filename);
          if (
            existing.content &&
            existing.content !== d.files?.[filename] &&
            existing.content !== expected
          )
            throw new Error(
              "Theme file was changed outside this app. Duplicate this page to create a new template.",
            );
        }
        d.files = privateFiles;
        d.filename = templateName;
        d.publishedVersion = page.version;
        d.uncertain = false;
        await persist();
        await upsertFiles(admin, setup.themeId, privateFiles);
        if (Object.keys(imageAssets).length)
          await upsertFiles(admin, setup.themeId, imageAssets, "BASE64");
        for (const [filename, expected] of Object.entries(privateFiles))
          if (
            (await readFile(admin, setup.themeId, filename)).content !==
            expected
          )
            throw new Error(
              "Upload could not be verified. Refresh and Verify upload.",
            );
        const themeNumber = setup.themeId.split("/").pop();
        d.editorUrl =
          "https://" +
          shop +
          "/admin/themes/" +
          themeNumber +
          "/editor?template=" +
          encodeURIComponent(
            (setup.kind === "home" ? "index" : setup.kind) + ".aip-" + page.id,
          );
        d.previewUrl = "https://" + shop + "/?preview_theme_id=" + themeNumber;
        await persist();
        await db.aiPage.update({
          where: { id: page.id },
          data: { status: "deployed", operationAt: null },
        });
      } else if (intent === "activate") {
        if (
          page.status !== "deployed" ||
          d.publishedVersion !== page.version ||
          !d.files
        )
          throw new Error("Upload and review the current saved version first.");
        for (const [filename, expected] of Object.entries(d.files))
          if (
            (await readFile(admin, setup.themeId, filename)).content !==
            expected
          )
            throw new Error(
              "The theme changed after upload. Review it before activation.",
            );
        const theme = (await readFile(admin, setup.themeId, d.filename!)).theme;
        if (theme.role !== "MAIN")
          throw new Error(
            "This is a draft theme. Review it in Shopify and publish the theme there before assigning pages.",
          );
        const suffix = "aip-" + page.id;
        if (setup.kind === "home") {
          const home = await readFile(
            admin,
            setup.themeId,
            "templates/index.json",
          );
          if (!home.content)
            throw new Error("A JSON home template is required.");
          d.homeBefore = home.content;
          d.homeAfter = d.files[d.filename!];
          d.uncertain = true;
          await persist();
          await upsertFiles(admin, setup.themeId, {
            "templates/index.json": d.homeAfter!,
          });
          if (
            (await readFile(admin, setup.themeId, "templates/index.json"))
              .content !== d.homeAfter
          )
            throw new Error("Home activation could not be verified.");
        } else if (setup.kind === "product") {
          const products = await productFacts(
            admin,
            setup.target,
            setup.targetId,
            true,
          );
          if (!products.length)
            throw new Error(
              "Choose a product or collection to assign. For an any-product template assign products in Shopify.",
            );
          d.products = products.map((p) => ({
            id: p.id,
            before: p.templateSuffix,
            applied: false,
          }));
          d.uncertain = true;
          await persist();
          for (const product of d.products) {
            if (
              (await productFacts(admin, "product", product.id))[0]
                .templateSuffix !== product.before
            )
              throw new Error(
                "A product changed during assignment. Restore applied changes and review it before retrying.",
              );
            await assignProduct(admin, product.id, suffix);
            product.applied = true;
            await persist();
            if (
              (await productFacts(admin, "product", product.id))[0]
                .templateSuffix !== suffix
            )
              throw new Error("Product assignment could not be verified.");
          }
        } else {
          if (
            !ws.scopes.some(
              (s) => s === "write_content" || s === "write_online_store_pages",
            )
          )
            throw new Error("Grant page publishing access first.");
          d.uncertain = true;
          await persist();
          if (d.pageId) {
            const updated = await graphql<{
              pageUpdate: { userErrors: { message: string }[] };
            }>(admin, AI_PAGE_UPDATE, {
              id: d.pageId,
              page: {
                title: content.title,
                templateSuffix: suffix,
                isPublished: true,
              },
            });
            userErrors(updated.pageUpdate);
          } else {
            // A deterministic handle plus the attention state avoids unsafe retries after an ambiguous request.
            const handle = "aip-" + page.id;
            const result = await graphql<{
              pageCreate: {
                page: { id: string; handle: string } | null;
                userErrors: { message: string }[];
              };
            }>(admin, AI_PAGE_CREATE, {
              page: {
                title: content.title,
                handle,
                body:
                  "<p>" +
                  content.seoDescription
                    .replaceAll("&", "&amp;")
                    .replaceAll("<", "&lt;")
                    .replaceAll(">", "&gt;") +
                  "</p>",
                templateSuffix: suffix,
                isPublished: true,
              },
            });
            userErrors(result.pageCreate);
            if (!result.pageCreate.page)
              throw new Error("Shopify did not return the created page.");
            d.pageId = result.pageCreate.page.id;
            d.handle = result.pageCreate.page.handle;
            await persist();
          }
          d.previewUrl = "https://" + shop + "/pages/" + d.handle;
        }
        d.activated = true;
        d.uncertain = false;
        await persist();
        await db.aiPage.update({
          where: { id: page.id },
          data: { status: "published", operationAt: null },
        });
      } else {
        if (!d.activated && !d.uncertain)
          throw new Error("This page has no active changes to restore.");
        if (setup.kind === "home" && d.homeBefore) {
          const current = (
            await readFile(admin, setup.themeId, "templates/index.json")
          ).content;
          if (current !== d.homeAfter && current !== d.homeBefore)
            throw new Error(
              "Home page changed after activation. Restore was stopped to protect that edit.",
            );
          if (current !== d.homeBefore)
            await upsertFiles(admin, setup.themeId, {
              "templates/index.json": d.homeBefore,
            });
          if (
            (await readFile(admin, setup.themeId, "templates/index.json"))
              .content !== d.homeBefore
          )
            throw new Error("Restore could not be verified.");
        } else if (setup.kind === "product" && d.products) {
          for (const product of d.products) {
            const current = (
              await productFacts(admin, "product", product.id)
            )[0].templateSuffix;
            if (current !== "aip-" + page.id && current !== product.before)
              throw new Error(
                "A product template changed outside this app. Review it before restoring.",
              );
            if (current === "aip-" + page.id)
              await assignProduct(admin, product.id, product.before);
            if (
              (await productFacts(admin, "product", product.id))[0]
                .templateSuffix !== product.before
            )
              throw new Error("Product restore could not be verified.");
            product.applied = false;
            await persist();
          }
        } else if (setup.kind === "page" && d.pageId) {
          const current = await graphql<{
            page: { templateSuffix: string } | null;
          }>(admin, AI_READ_PAGE, { id: d.pageId });
          if (current.page && current.page.templateSuffix !== "aip-" + page.id)
            throw new Error("This page template changed outside the app.");
          if (current.page) {
            const result = await graphql<{
              pageUpdate: { userErrors: { message: string }[] };
            }>(admin, AI_PAGE_UPDATE, {
              id: d.pageId,
              page: { isPublished: false },
            });
            userErrors(result.pageUpdate);
            const restored = await graphql<{
              page: { isPublished: boolean } | null;
            }>(admin, AI_READ_PAGE, { id: d.pageId });
            if (restored.page?.isPublished)
              throw new Error("Page unpublish could not be verified.");
          }
        } else if (d.uncertain)
          throw new Error(
            "The create-page result was interrupted before an ID was saved. Search Shopify Pages for handle aip-" +
              page.id +
              " and unpublish it manually before removing this warning.",
          );
        d.activated = false;
        d.uncertain = false;
        await persist();
        await db.aiPage.update({
          where: { id: page.id },
          data: { status: "deployed", operationAt: null },
        });
      }
    } catch (error) {
      await db.aiPage.update({
        where: { id: page.id },
        data: {
          status: d.files || d.uncertain ? "attention" : "ready",
          error: (error as Error).message.slice(0, 500),
          operationAt: null,
        },
      });
      throw error;
    }
    return workspace(shop, admin);
  }
  async function imageFiles(shop: string, content: PageContent) {
    const files: Record<string, string> = {};
    for (const section of content.sections) {
      const id = section.image.match(
        /^\/(?:app\/ai-image|__ai-image)\?id=([a-f0-9]{32})$/,
      )?.[1];
      if (!id) continue;
      const asset = await db.aiImage.findFirst({ where: { id, shop } });
      if (!asset) throw new Error("Generated image is no longer available.");
      files["assets/aip-image-" + id + ".png"] = asset.data;
    }
    return files;
  }
  async function makeFiles(
    shop: string,
    id: string,
    setup: PageSetup,
    content: PageContent,
    brand: Brand,
    source?: ReturnType<typeof parseTemplate>,
  ) {
    const files = themeFiles(id, setup, content, brand, source);
    const filename = Object.keys(files).find((f) =>
      f.startsWith("templates/"),
    )!;
    const template = JSON.parse(files[filename]);
    for (const section of Object.values(template.sections) as {
      settings?: { image_url?: string; image_asset?: string };
    }[]) {
      const imageId = section.settings?.image_url?.match(
        /^\/(?:app\/ai-image|__ai-image)\?id=([a-f0-9]{32})$/,
      )?.[1];
      if (imageId && section.settings) {
        if (!(await db.aiImage.findFirst({ where: { id: imageId, shop } })))
          throw new Error("Generated image is unavailable.");
        section.settings.image_asset = "aip-image-" + imageId + ".png";
        section.settings.image_url = "";
      }
    }
    files[filename] = JSON.stringify(template, null, 2);
    return files;
  }
  async function exportPage(shop: string, id: string, admin?: AdminClient) {
    const page = await requirePage(shop, id),
      setup = validateSetup(JSON.parse(page.setup)),
      content = validateContent(JSON.parse(page.content));
    let source;
    if (setup.keepSections || setup.mode !== "full") {
      if (!admin || !setup.themeId || !setup.sourceTemplate)
        throw new Error(
          "Connect your Shopify theme to export preserved sections.",
        );
      const file = await readFile(admin, setup.themeId, setup.sourceTemplate);
      if (!file.content) throw new Error("Source template not found.");
      source = parseTemplate(file.content);
    }
    const a = await account(shop),
      files = await makeFiles(
        shop,
        id,
        setup,
        content,
        validateBrand({ ...DEFAULT_BRAND, ...JSON.parse(a.brand) }),
        source,
      ),
      images = await imageFiles(shop, content);
    return Object.fromEntries([
      ...Object.entries(files).map(([name, value]) => [
        name,
        { value, type: "TEXT" },
      ]),
      ...Object.entries(images).map(([name, value]) => [
        name,
        { value, type: "BASE64" },
      ]),
    ]) as Record<string, { value: string; type: "TEXT" | "BASE64" }>;
  }
  async function image(shop: string, id: string) {
    return db.aiImage.findFirst({ where: { id, shop } });
  }
  return {
    workspace,
    command,
    recover,
    settle,
    requirePage,
    exportPage,
    image,
  };
}
