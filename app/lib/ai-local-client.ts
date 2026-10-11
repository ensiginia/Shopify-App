import type { AIClient, AIWorkspace, PageKind } from "./ai-pages";
export const localAIClient: AIClient = {
  async load() {
    const response = await fetch("/__ai", { headers: { "X-AI-Local": "1" } });
    const body = await response.json();
    if (!response.ok)
      throw new Error(
        body.error ||
          "Local AI workspace unavailable. Restart npm run dev:prototype.",
      );
    return body as AIWorkspace;
  },
  async command(intent, payload) {
    const response = await fetch("/__ai", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-AI-Local": "1" },
      body: JSON.stringify({ intent, payload }),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Could not save.");
    return body as AIWorkspace;
  },
  async export(id) {
    const r = await fetch("/__ai?export=" + id, {
      headers: { "X-AI-Local": "1" },
    });
    const b = await r.json();
    if (!r.ok) throw new Error(b.error);
    return b.files;
  },
  async pick() {
    throw new Error(
      "Product selection is available in your linked Shopify app.",
    );
  },
};
export async function readTemplates(themeId: string, kind: PageKind) {
  void themeId;
  void kind;
  return [] as string[];
}
