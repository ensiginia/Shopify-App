export type RewardTier = {
  id: string;
  title: string;
  threshold: number;
  kind: "shipping" | "discount" | "gift";
};
export function rewardProgress(tiers: RewardTier[], value: number) {
  const sorted = tiers
    .filter((t) => Number.isFinite(t.threshold) && t.threshold > 0)
    .slice()
    .sort((a, b) => a.threshold - b.threshold);
  const next = sorted.find((t) => t.threshold > value);
  const max = sorted.at(-1)?.threshold || 1;
  return {
    tiers: sorted,
    next,
    remaining: next ? Math.max(0, next.threshold - value) : 0,
    percent: Math.max(0, Math.min(100, (value / max) * 100)),
    unlocked: sorted.filter((t) => value >= t.threshold),
  };
}
export function cartPreviewTotals(
  products: { id: string; price: number; compare: number }[],
  items: Record<string, number>,
  codes: string[],
  empty = false,
) {
  let totalCents = 0,
    compareCents = 0,
    count = 0;
  for (const p of products) {
    const quantity = empty
      ? 0
      : Math.max(0, Math.min(999, Math.floor(items[p.id] || 0)));
    count += quantity;
    totalCents += Math.round(p.price * 100) * quantity;
    compareCents += Math.round(p.compare * 100) * quantity;
  }
  const discountCents = codes.some((c) =>
    ["SAVE10", "WELCOME10"].includes(c.toUpperCase()),
  )
    ? Math.round(totalCents * 0.1)
    : 0;
  return {
    total: totalCents / 100,
    compare: compareCents / 100,
    discount: discountCents / 100,
    subtotal: (totalCents - discountCents) / 100,
    count,
  };
}
export function normalizeQuantity(value: number) {
  return Number.isFinite(value)
    ? Math.max(0, Math.min(999, Math.floor(value)))
    : 0;
}
