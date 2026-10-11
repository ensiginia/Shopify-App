import { createHash } from "node:crypto";
import db from "../db.server";

const key = (shop: string) => "cart-draft-" + createHash("sha256").update(shop).digest("hex");

export async function cartDraft(shop: string) {
  const entry = await db.resourceEntry.findFirst({ where: { id: key(shop), shop, kind: "cart-draft" } });
  return entry ? { config: JSON.parse(entry.body) as Record<string, unknown>, version: entry.version } : { config: null, version: 0 };
}

export async function saveCartDraft(shop: string, input: unknown) {
  if (!input || typeof input !== "object") throw new Error("Invalid cart draft.");
  const { config, version } = input as { config: unknown; version: number };
  if (!config || typeof config !== "object" || Array.isArray(config) || !Number.isInteger(version) || version < 0) throw new Error("Invalid cart draft.");
  const body = JSON.stringify(config);
  if (body.length > 200000) throw new Error("Cart draft is too large.");
  const values = config as Record<string, unknown>;
  if (typeof values.name !== "string" || values.name.length > 160 || !["right", "left"].includes(String(values.position))) throw new Error("Invalid cart name or position.");
  const existing = await db.resourceEntry.findFirst({ where: { id: key(shop), shop, kind: "cart-draft" } });
  if (existing) {
    const result = await db.resourceEntry.updateMany({ where: { id: existing.id, shop, version }, data: { body, version: { increment: 1 } } });
    if (!result.count) throw new Error("This cart draft changed in another window. Reload before saving.");
  } else {
    if (version !== 0) throw new Error("Reload the cart draft before saving.");
    try {
      await db.resourceEntry.create({ data: { id: key(shop), shop, kind: "cart-draft", title: "Cart design", body, status: "Draft" } });
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "P2002") throw new Error("This cart draft changed in another window. Reload before saving.");
      throw error;
    }
  }
  return cartDraft(shop);
}
