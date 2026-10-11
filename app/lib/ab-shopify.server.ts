import type { Setup, VariantKey } from "./experiments";

export type AdminClient = {
  graphql(
    query: string,
    options?: { variables?: Record<string, unknown> },
  ): Promise<Response>;
};
export type CatalogProduct = {
  id: string;
  title: string;
  handle: string;
  publishedAt: string | null;
  status: string;
  variants: {
    nodes: {
      id: string;
      title: string;
      price: string;
      inventoryQuantity: number;
      inventoryPolicy: string;
      inventoryItem: { tracked: boolean };
    }[];
  };
};
export const CONTEXT_QUERY = `#graphql
query ABContext {
  shop { currencyCode primaryDomain { url } }
  currentAppInstallation { accessScopes { handle } activeSubscriptions { name status } }
  products(first: 50, query: "status:active") { nodes {
    id title handle status publishedAt
    variants(first: 20) { nodes { id title price } }
  } }
}`;
export const PRODUCT_QUERY = `#graphql
query ABProduct($id: ID!) { product(id: $id) { id title handle status publishedAt variants(first: 100) { nodes { id title price inventoryQuantity inventoryPolicy inventoryItem { tracked } } } } }`;
export const FIND_DISCOUNT = `#graphql
query ABDiscount($code: String!) { codeDiscountNodeByCode(code: $code) { id } }`;
export const VARIANT_QUERY = `#graphql
query ABVariant($id: ID!) { productVariant(id: $id) { id product { id } inventoryQuantity inventoryPolicy inventoryItem { tracked } } }`;
export const BASIC_DISCOUNT = `#graphql
mutation ABBundleDiscount($input: DiscountCodeBasicInput!) { discountCodeBasicCreate(basicCodeDiscount: $input) { codeDiscountNode { id } userErrors { field message } } }`;
export const SHIPPING_DISCOUNT = `#graphql
mutation ABShippingDiscount($input: DiscountCodeFreeShippingInput!) { discountCodeFreeShippingCreate(freeShippingCodeDiscount: $input) { codeDiscountNode { id } userErrors { field message } } }`;
export const ACTIVATE_DISCOUNT = `#graphql
mutation ABActivate($id: ID!) { discountCodeActivate(id: $id) { codeDiscountNode { id } userErrors { field message } } }`;
export const DEACTIVATE_DISCOUNT = `#graphql
mutation ABDeactivate($id: ID!) { discountCodeDeactivate(id: $id) { codeDiscountNode { id } userErrors { field message } } }`;
export const UPDATE_BASIC = `#graphql
mutation ABUpdateBundle($id: ID!, $input: DiscountCodeBasicInput!) { discountCodeBasicUpdate(id: $id, basicCodeDiscount: $input) { codeDiscountNode { id } userErrors { field message } } }`;
export const UPDATE_SHIPPING = `#graphql
mutation ABUpdateShipping($id: ID!, $input: DiscountCodeFreeShippingInput!) { discountCodeFreeShippingUpdate(id: $id, freeShippingCodeDiscount: $input) { codeDiscountNode { id } userErrors { field message } } }`;
export const REFUND_QUERY = `#graphql
query ABRefundTotal($id: ID!) { order(id: $id) { totalRefundedSet { shopMoney { amount currencyCode } } } }`;

export async function graphql<T>(
  admin: AdminClient,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const response = await admin.graphql(
    query,
    variables ? { variables } : undefined,
  );
  const body = (await response.json()) as {
    data?: T;
    errors?: { message: string }[];
  };
  if (!response.ok || body.errors?.length || !body.data)
    throw new Error(
      body.errors?.map((e) => e.message).join("; ") ||
        "Shopify request failed. Try again.",
    );
  return body.data;
}
export async function context(admin: AdminClient) {
  return graphql<{
    shop: { currencyCode: string; primaryDomain: { url: string } };
    currentAppInstallation: {
      accessScopes: { handle: string }[];
      activeSubscriptions: { name: string; status: string }[];
    };
    products: { nodes: CatalogProduct[] };
  }>(admin, CONTEXT_QUERY);
}
export async function validateTargets(admin: AdminClient, setup: Setup) {
  const ids = [
    setup.surface === "Bundles" ? setup.productId : undefined,
    setup.upsellProductId,
  ].filter((id): id is string => !!id);
  for (const id of new Set(ids)) {
    const { product } = await graphql<{ product: CatalogProduct | null }>(
      admin,
      PRODUCT_QUERY,
      { id },
    );
    if (!product || product.status !== "ACTIVE" || !product.publishedAt)
      throw new Error(
        "Selected products must be active and published to the Online Store.",
      );
    if (id === setup.productId) setup.productTitle = product.title;
    if (id === setup.upsellProductId) setup.upsellHandle = product.handle;
  }
  if (
    setup.surface === "Carts" &&
    (setup.variants.A.upsell || setup.variants.B.upsell)
  ) {
    const { productVariant: v } = await graphql<{
      productVariant: {
        id: string;
        product: { id: string };
        inventoryQuantity: number;
        inventoryPolicy: string;
        inventoryItem: { tracked: boolean };
      } | null;
    }>(admin, VARIANT_QUERY, { id: setup.upsellVariantId });
    if (
      !v ||
      v.product.id !== setup.upsellProductId ||
      (v.inventoryItem.tracked &&
        v.inventoryPolicy !== "CONTINUE" &&
        v.inventoryQuantity <= 0)
    )
      throw new Error(
        "Choose an available upsell variant belonging to this product.",
      );
  }
}
export type Discount = {
  id: string;
  code: string;
  kind: "bundle" | "shipping";
};
export type Discounts = Partial<Record<VariantKey, Discount>>;
export async function existingDiscounts(
  admin: AdminClient,
  id: string,
  setup: Setup,
): Promise<Discounts> {
  const result: Discounts = {};
  for (const key of ["A", "B"] as const) {
    const code = `SSAB-${id.replace(/-/g, "").slice(0, 24)}-${key}`;
    const data = await graphql<{
      codeDiscountNodeByCode: { id: string } | null;
    }>(admin, FIND_DISCOUNT, { code });
    if (data.codeDiscountNodeByCode)
      result[key] = {
        id: data.codeDiscountNodeByCode.id,
        code,
        kind: setup.surface === "Bundles" ? "bundle" : "shipping",
      };
  }
  return result;
}
type DiscountResult = {
  codeDiscountNode: { id: string } | null;
  userErrors: { message: string }[];
};
function check(result: DiscountResult) {
  if (result.userErrors.length || !result.codeDiscountNode)
    throw new Error(
      result.userErrors.map((e) => e.message).join("; ") ||
        "Discount was not created.",
    );
  return result.codeDiscountNode.id;
}
export async function ensureDiscount(
  admin: AdminClient,
  id: string,
  setup: Setup,
  key: VariantKey,
  start: Date,
): Promise<Discount | null> {
  const variant = setup.variants[key];
  if (
    setup.surface === "Bundles" ? variant.discount === 0 : variant.reward === 0
  )
    return null;
  const code = `SSAB-${id.replace(/-/g, "").slice(0, 24)}-${key}`;
  const kind = setup.surface === "Bundles" ? "bundle" : "shipping";
  const endsAt = new Date(
    start.getTime() + (setup.minimumDays + 7) * 86400000,
  ).toISOString();
  const found = await graphql<{
    codeDiscountNodeByCode: { id: string } | null;
  }>(admin, FIND_DISCOUNT, { code });
  if (found.codeDiscountNodeByCode) {
    await extendDiscount(
      admin,
      { id: found.codeDiscountNodeByCode.id, code, kind },
      new Date(endsAt),
    );
    return { id: found.codeDiscountNodeByCode.id, code, kind };
  }
  const common = {
    code,
    title: `A/B ${setup.name} · ${key}`,
    context: { all: true },
    startsAt: start.toISOString(),
    endsAt,
    appliesOncePerCustomer: false,
    combinesWith: {
      orderDiscounts: false,
      productDiscounts: false,
      shippingDiscounts: false,
    },
  };
  if (kind === "bundle") {
    const result = await graphql<{ discountCodeBasicCreate: DiscountResult }>(
      admin,
      BASIC_DISCOUNT,
      {
        input: {
          ...common,
          customerGets: {
            value: { percentage: variant.discount / 100 },
            items: { products: { productsToAdd: [setup.productId] } },
          },
          minimumRequirement: {
            quantity: {
              greaterThanOrEqualToQuantity: String(variant.quantity),
            },
          },
        },
      },
    );
    return { id: check(result.discountCodeBasicCreate), code, kind };
  }
  const result = await graphql<{
    discountCodeFreeShippingCreate: DiscountResult;
  }>(admin, SHIPPING_DISCOUNT, {
    input: {
      ...common,
      destination: { all: true },
      appliesOnOneTimePurchase: true,
      appliesOnSubscription: false,
      minimumRequirement: {
        subtotal: { greaterThanOrEqualToSubtotal: variant.reward.toFixed(2) },
      },
    },
  });
  return { id: check(result.discountCodeFreeShippingCreate), code, kind };
}
export async function setDiscount(
  admin: AdminClient,
  discount: Discount,
  enabled: boolean,
) {
  const data = await graphql<Record<string, DiscountResult>>(
    admin,
    enabled ? ACTIVATE_DISCOUNT : DEACTIVATE_DISCOUNT,
    { id: discount.id },
  );
  check(Object.values(data)[0]);
}
export async function expireDiscount(
  admin: AdminClient,
  discount: Discount,
  until: Date,
) {
  const data = await graphql<Record<string, DiscountResult>>(
    admin,
    discount.kind === "bundle" ? UPDATE_BASIC : UPDATE_SHIPPING,
    { id: discount.id, input: { endsAt: until.toISOString() } },
  );
  check(Object.values(data)[0]);
}
export async function extendDiscount(
  admin: AdminClient,
  discount: Discount,
  until: Date,
) {
  await expireDiscount(admin, discount, until);
  await setDiscount(admin, discount, true);
}
