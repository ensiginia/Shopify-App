import { graphql } from "./ab-shopify.server";
import type { AdminClient } from "./ab-shopify.server";
export const AI_CONTEXT = `#graphql
query AIContext { shop { name primaryDomain { url } } currentAppInstallation { accessScopes { handle } } }`;
export const AI_THEMES = `#graphql
query AIThemes { themes(first: 50) { nodes { id name role } } }`;
export const AI_FILE = `#graphql
query AIFile($id: ID!, $filenames: [String!]!) { theme(id: $id) { id name role files(first: 50, filenames: $filenames) { nodes { filename body { ... on OnlineStoreThemeFileBodyText { content } } } } } }`;
export const AI_TEMPLATES = `#graphql
query AITemplates($id: ID!, $after: String) { theme(id: $id) { files(first: 100, after: $after) { nodes { filename } pageInfo { hasNextPage endCursor } } } }`;
export const AI_PRODUCT = `#graphql
query AIProduct($id: ID!) { product(id: $id) { id title handle description templateSuffix featuredMedia { preview { image { url altText } } } } }`;
export const AI_COLLECTION = `#graphql
query AICollection($id: ID!, $after: String, $first: Int!) { collection(id: $id) { id title description products(first: $first, after: $after) { nodes { id title handle description templateSuffix featuredMedia { preview { image { url altText } } } } pageInfo { hasNextPage endCursor } } } }`;
export const AI_UPSERT = `#graphql
mutation AIUpsert($id: ID!, $files: [OnlineStoreThemeFilesUpsertFileInput!]!) { themeFilesUpsert(themeId: $id, files: $files) { upsertedThemeFiles { filename } job { id } userErrors { field message } } }`;
export const AI_JOB = `#graphql
query AIJob($id: ID!) { job(id: $id) { id done } }`;
export const AI_ASSIGN = `#graphql
mutation AIAssign($product: ProductUpdateInput!) { productUpdate(product: $product) { product { id templateSuffix } userErrors { field message } } }`;
export const AI_PAGE_CREATE = `#graphql
mutation AICreatePage($page: PageCreateInput!) { pageCreate(page: $page) { page { id handle isPublished templateSuffix } userErrors { field message } } }`;
export const AI_PAGE_UPDATE = `#graphql
mutation AIUpdatePage($id: ID!, $page: PageUpdateInput!) { pageUpdate(id: $id, page: $page) { page { id handle isPublished templateSuffix } userErrors { field message } } }`;
export const AI_READ_PAGE = `#graphql
query AIReadPage($id: ID!) { page(id: $id) { id handle isPublished templateSuffix } }`;
export type ProductFact = {
  id: string;
  title: string;
  handle: string;
  description: string;
  templateSuffix: string | null;
  featuredImage: { url: string; altText: string | null } | null;
  featuredMedia?: {
    preview?: { image?: { url: string; altText: string | null } | null } | null;
  } | null;
};
export type ThemeInfo = {
  id: string;
  name: string;
  role: string;
  files: { nodes: { filename: string; body: { content?: string } }[] };
};
export async function readFile(
  admin: AdminClient,
  id: string,
  filename: string,
) {
  const { theme } = await graphql<{ theme: ThemeInfo | null }>(admin, AI_FILE, {
    id,
    filenames: [filename],
  });
  if (!theme) throw new Error("Theme is no longer available.");
  const file = theme.files.nodes.find((f) => f.filename === filename);
  return { theme, content: file?.body.content || null };
}
export async function listTemplates(
  admin: AdminClient,
  id: string,
  kind: string,
) {
  const names: string[] = [];
  let after: string | null = null;
  for (let i = 0; i < 30; i++) {
    const data: {
      theme: {
        files: {
          nodes: { filename: string }[];
          pageInfo: { hasNextPage: boolean; endCursor: string };
        };
      } | null;
    } = await graphql(admin, AI_TEMPLATES, { id, after });
    if (!data.theme) throw new Error("Theme is unavailable.");
    names.push(
      ...data.theme.files.nodes
        .map((f) => f.filename)
        .filter((f) =>
          new RegExp(
            "^templates/" +
              (kind === "home" ? "index" : kind) +
              "(\\.[^/]+)?\\.json$",
          ).test(f),
        ),
    );
    if (!data.theme.files.pageInfo.hasNextPage) return names.sort();
    after = data.theme.files.pageInfo.endCursor;
  }
  throw new Error(
    "Theme contains too many files to scan. Enter a JSON template path.",
  );
}
export async function productFacts(
  admin: AdminClient,
  type: string,
  id: string,
  all = false,
): Promise<ProductFact[]> {
  if (type === "any") return [];
  if (type === "product") {
    const { product } = await graphql<{ product: ProductFact | null }>(
      admin,
      AI_PRODUCT,
      { id },
    );
    if (!product) throw new Error("Selected product was removed.");
    return [
      {
        ...product,
        featuredImage:
          product.featuredMedia?.preview?.image ||
          product.featuredImage ||
          null,
      },
    ];
  }
  const products: ProductFact[] = [];
  let after: string | null = null;
  for (let i = 0; i < 10; i++) {
    const data: {
      collection: {
        products: {
          nodes: ProductFact[];
          pageInfo: { hasNextPage: boolean; endCursor: string };
        };
      } | null;
    } = await graphql(admin, AI_COLLECTION, {
      id,
      after,
      first: all ? 100 : 8,
    });
    if (!data.collection) throw new Error("Selected collection was removed.");
    products.push(
      ...data.collection.products.nodes.map((p) => ({
        ...p,
        description: p.description.slice(0, 4000),
        featuredImage:
          p.featuredMedia?.preview?.image || p.featuredImage || null,
      })),
    );
    if (!all) return products;
    if (!data.collection.products.pageInfo.hasNextPage) return products;
    after = data.collection.products.pageInfo.endCursor;
  }
  throw new Error(
    "This collection has more than 1,000 products. Choose individual products.",
  );
}
export function userErrors(result: { userErrors: { message: string }[] }) {
  if (result.userErrors?.length)
    throw new Error(result.userErrors.map((e) => e.message).join("; "));
}
export async function upsertFiles(
  admin: AdminClient,
  id: string,
  files: Record<string, string>,
  type = "TEXT",
) {
  const data = await graphql<{
    themeFilesUpsert: {
      job: { id: string } | null;
      userErrors: { message: string }[];
    };
  }>(admin, AI_UPSERT, {
    id,
    files: Object.entries(files).map(([filename, value]) => ({
      filename,
      body: { type, value },
    })),
  });
  userErrors(data.themeFilesUpsert);
  const job = data.themeFilesUpsert.job;
  if (job) {
    for (let i = 0; i < 30; i++) {
      const state = await graphql<{ job: { done: boolean } | null }>(
        admin,
        AI_JOB,
        { id: job.id },
      );
      if (state.job?.done) return;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error(
      "Theme upload is still processing. Refresh and verify before activating.",
    );
  }
}
export async function assignProduct(
  admin: AdminClient,
  id: string,
  templateSuffix: string | null,
) {
  const data = await graphql<{
    productUpdate: { userErrors: { message: string }[] };
  }>(admin, AI_ASSIGN, {
    product: { id, templateSuffix: templateSuffix || "" },
  });
  userErrors(data.productUpdate);
}
