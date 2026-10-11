import { createHmac, timingSafeEqual } from "node:crypto";
import type { VariantKey } from "./experiments";

export type Attribution = {
  shop: string;
  experimentId: string;
  visitorHash: string;
  variant: VariantKey;
  issuedAt: number;
};
export function visitorHash(shop: string, visitor: string, secret: string) {
  if (!/^[a-zA-Z0-9-]{8,80}$/.test(visitor))
    throw new Error("Invalid anonymous visitor ID.");
  return createHmac("sha256", secret)
    .update(`visitor:${shop}:${visitor}`)
    .digest("hex");
}
export function signAttribution(value: Attribution, secret: string) {
  if (!secret)
    throw new Error("An app secret is required for live attribution.");
  const body = Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${body}.${createHmac("sha256", secret).update(body).digest("base64url")}`;
}
export function verifyAttribution(
  token: string,
  shop: string,
  secret: string,
  now = Date.now(),
): Attribution | null {
  if (!secret || token.length > 1200) return null;
  const [body, signature, extra] = token.split(".");
  if (!body || !signature || extra) return null;
  const expected = createHmac("sha256", secret).update(body).digest();
  const actual = Buffer.from(signature, "base64url");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual))
    return null;
  try {
    const v = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as Attribution;
    if (
      v.shop !== shop ||
      typeof v.experimentId !== "string" ||
      !/^[a-f0-9]{64}$/.test(v.visitorHash) ||
      !["A", "B"].includes(v.variant) ||
      !Number.isFinite(v.issuedAt) ||
      v.issuedAt > now + 60000 ||
      now - v.issuedAt > 7 * 86400000
    )
      return null;
    return v;
  } catch {
    return null;
  }
}
export function cents(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = String(value);
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const [whole, decimal = ""] = text.split(".");
  const amount = Number(whole) * 100 + Number(decimal.padEnd(2, "0"));
  return Number.isSafeInteger(amount) && amount <= 2147483647 ? amount : null;
}
