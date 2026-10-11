import { defaults, validateSetup } from "./experiments";
import type { Setup, Surface, Variant } from "./experiments";

export function parseSetup(raw: unknown, live = false): Setup {
  if (!raw || typeof raw !== "object")
    throw new Error("Test setup is required.");
  const value = raw as Record<string, unknown>;
  if (value.surface !== "Carts" && value.surface !== "Bundles")
    throw new Error("Choose a supported test type.");
  const setup = defaults(value.surface as Surface);
  for (const field of ["name", "hypothesis", "target", "currency"] as const) {
    if (typeof value[field] !== "string") throw new Error(`Invalid ${field}.`);
    setup[field] = value[field];
  }
  for (const field of ["split", "minimumDays", "minimumVisitors"] as const) {
    if (typeof value[field] !== "number") throw new Error(`Invalid ${field}.`);
    setup[field] = value[field];
  }
  if (!value.variants || typeof value.variants !== "object")
    throw new Error("Both variants are required.");
  const variants = value.variants as Record<string, unknown>;
  for (const key of ["A", "B"] as const) {
    const rawVariant = variants[key];
    if (!rawVariant || typeof rawVariant !== "object")
      throw new Error(`Variant ${key} is required.`);
    const v = rawVariant as Record<string, unknown>;
    for (const field of ["name", "checkout", "color"] as const)
      if (typeof v[field] !== "string")
        throw new Error(`Invalid variant ${field}.`);
    for (const field of ["quantity", "discount", "reward"] as const)
      if (typeof v[field] !== "number" || !Number.isFinite(v[field]))
        throw new Error(`Invalid variant ${field}.`);
    if (typeof v.upsell !== "boolean")
      throw new Error("Upsell must be true or false.");
    setup.variants[key] = {
      name: v.name,
      checkout: v.checkout,
      color: v.color,
      quantity: v.quantity,
      discount: v.discount,
      reward: v.reward,
      upsell: v.upsell,
    } as Variant;
  }
  for (const field of [
    "productId",
    "upsellProductId",
    "upsellVariantId",
    "productTitle",
    "upsellHandle",
  ] as const) {
    if (value[field] !== undefined && typeof value[field] !== "string")
      throw new Error(`Invalid ${field}.`);
    if (typeof value[field] === "string")
      setup[field] = value[field].slice(0, 250);
  }
  const error = validateSetup(setup);
  if (error) throw new Error(error);
  if (
    live &&
    setup.surface === "Bundles" &&
    !/^gid:\/\/shopify\/Product\/\d+$/.test(setup.productId || "")
  )
    throw new Error("Select a real product for this bundle test.");
  if (
    live &&
    setup.surface === "Carts" &&
    (setup.variants.A.upsell || setup.variants.B.upsell) &&
    (!/^gid:\/\/shopify\/Product\/\d+$/.test(setup.upsellProductId || "") ||
      !/^gid:\/\/shopify\/ProductVariant\/\d+$/.test(
        setup.upsellVariantId || "",
      ))
  )
    throw new Error("Select a real upsell product and variant.");
  return setup;
}
