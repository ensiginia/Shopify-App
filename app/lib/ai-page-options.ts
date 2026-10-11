import type { Brand } from "./ai-pages";

export const STYLE_PRESETS = {
  store: { name: "Your store", domain: "", style: "Minimal", color: "#172d32", background: "#ffffff", direction: "Use the merchant's existing brand guidelines." },
  rhode: { name: "Rhode", domain: "rhodeskin.com", style: "Minimal", color: "#514a43", background: "#f4f1ed", direction: "Restrained typography, soft neutral colors, generous space and clear product-led storytelling." },
  seed: { name: "Seed", domain: "seed.com", style: "Editorial", color: "#183d2b", background: "#f4f1e8", direction: "Editorial typography, botanical tones, structured educational benefits and concise factual explanations." },
  spacegoods: { name: "Spacegoods", domain: "spacegoods.com", style: "Bold", color: "#6527cc", background: "#fff2f8", direction: "Bold headings, playful high-contrast color and energetic benefit-led sections." },
} as const;
export type Inspiration = keyof typeof STYLE_PRESETS;

export function resolveBrand(brand: Brand): Brand {
  const preset = STYLE_PRESETS[brand.inspiration || "store"];
  if (brand.inspiration === "store" || !brand.inspiration) return brand;
  return {
    ...brand,
    style: preset.style,
    voice: `${brand.voice}. Design direction: ${preset.direction}`,
    ...(brand.colorSource === "preset" ? { color: preset.color, background: preset.background } : {}),
  };
}

// Reference calculator observed at every 5-credit increment, 11 October 2026.
// Display estimates only; never grants credits or submits a charge.
const DISCOUNTS = [0, 6, 8, 10, 11, 13, 14, 15, 16, 17, 18, 19, 20, 21, 21, 22, 23, 24, 24, 25];
export function creditQuote(raw: number) {
  const quantity = Number.isFinite(raw) ? Math.min(100, Math.max(5, Math.round(raw / 5) * 5)) : 50;
  const percent = DISCOUNTS[quantity / 5 - 1];
  const subtotal = quantity * 100;
  const discount = Math.round(subtotal * percent / 100);
  return { quantity, percent, subtotal, discount, total: subtotal - discount };
}
