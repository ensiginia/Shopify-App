export const PAGE_KINDS = ["home", "product", "page"] as const;
export const SECTION_KINDS = [
  "hero",
  "text",
  "benefits",
  "faq",
  "cta",
  "product",
] as const;
export type PageKind = (typeof PAGE_KINDS)[number];
export type SectionKind = (typeof SECTION_KINDS)[number];
export type Brand = {
  name: string;
  voice: string;
  audience: string;
  color: string;
  background: string;
  style: string;
  inspiration?: "store" | "rhode" | "seed" | "spacegoods";
  colorSource?: "store" | "preset";
};
export type PageSetup = {
  kind: PageKind;
  mode: "full" | "buy-box" | "sections";
  title: string;
  prompt: string;
  themeId: string;
  sourceTemplate: string;
  keepSections: boolean;
  target: "product" | "collection" | "any";
  targetId: string;
  targetTitle: string;
  language: string;
  style: string;
};
export type PageSection = {
  id: string;
  kind: SectionKind;
  heading: string;
  text: string;
  image: string;
  imageAlt: string;
  button: string;
  url: string;
  items: { title: string; text: string }[];
  hidden: boolean;
};
export type PageContent = {
  title: string;
  seoDescription: string;
  sections: PageSection[];
};
export type SavedPage = {
  id: string;
  setup: PageSetup;
  content: PageContent;
  status: string;
  version: number;
  error: string;
  createdAt: string;
  updatedAt: string;
  deployment: {
    filename?: string;
    editorUrl?: string;
    previewUrl?: string;
    pageId?: string;
    handle?: string;
    activated?: boolean;
  };
};
export type AIWorkspace = {
  pages: SavedPage[];
  brand: Brand;
  balance: number;
  providerReady: boolean;
  imageReady: boolean;
  provider: string;
  themes: { id: string; name: string; role: string }[];
  scopes: string[];
  themeWrites: boolean;
  themeWriteApproved: boolean;
  catalogError: string;
  tutorialUrl: string;
  live: boolean;
};
export type AIClient = {
  load(): Promise<AIWorkspace>;
  command(
    intent: string,
    payload: Record<string, unknown>,
  ): Promise<AIWorkspace>;
  pick(
    type: "product" | "collection",
  ): Promise<{ id: string; title: string } | undefined>;
  export?(
    id: string,
  ): Promise<Record<string, { value: string; type: "TEXT" | "BASE64" }>>;
  templates?(themeId: string, kind: PageKind): Promise<string[]>;
  requestScopes?(scopes: string[]): Promise<void>;
};
export const DEFAULT_BRAND: Brand = {
  name: "",
  voice: "Clear, warm and helpful",
  audience: "",
  color: "#172d32",
  background: "#ffffff",
  style: "Minimal",
};
function text(value: unknown, max: number, name: string, required = false) {
  if (
    typeof value !== "string" ||
    value.length > max ||
    (required && !value.trim())
  )
    throw new Error("Invalid " + name + ".");
  return value.trim();
}
export function safeUrl(value: unknown, image = false) {
  const v = text(value, 2000, "URL");
  if (!v) return "";
  if (image && /^\/(app\/ai-image|__ai-image)\?id=[a-f0-9]{32}$/.test(v))
    return v;
  if (!image && /^\/(?!\/)[^\s\\]*$/.test(v)) return v;
  try {
    const url = new URL(v);
    if (url.protocol !== "https:" || url.username || url.password)
      throw new Error();
    return url.href;
  } catch {
    throw new Error("Use a secure https URL or a store-relative link.");
  }
}
export function validateBrand(raw: unknown): Brand {
  if (!raw || typeof raw !== "object") throw new Error("Invalid brand.");
  const b = raw as Brand;
  if (![b.color, b.background].every((c) => /^#[0-9a-f]{6}$/i.test(c)))
    throw new Error("Choose valid brand colors.");
  if (!["Minimal", "Bold", "Editorial"].includes(b.style))
    throw new Error("Invalid brand style.");
  if (b.inspiration !== undefined && !["store", "rhode", "seed", "spacegoods"].includes(b.inspiration))
    throw new Error("Invalid style preset.");
  if (b.colorSource !== undefined && !["store", "preset"].includes(b.colorSource))
    throw new Error("Invalid color source.");
  return {
    name: text(b.name, 100, "brand name"),
    voice: text(b.voice, 500, "brand voice"),
    audience: text(b.audience, 500, "audience"),
    color: b.color,
    background: b.background,
    style: b.style,
    ...(b.inspiration !== undefined ? { inspiration: b.inspiration } : {}),
    ...(b.colorSource !== undefined ? { colorSource: b.colorSource } : {}),
  };
}
export function validateSetup(raw: unknown): PageSetup {
  if (!raw || typeof raw !== "object")
    throw new Error("Invalid page settings.");
  const s = raw as PageSetup;
  if (
    !PAGE_KINDS.includes(s.kind) ||
    !["full", "buy-box", "sections"].includes(s.mode) ||
    !["product", "collection", "any"].includes(s.target)
  )
    throw new Error("Invalid page type.");
  if (s.kind !== "product" && s.mode !== "full")
    throw new Error("This mode applies to product pages.");
  if (typeof s.themeId !== "string")
    throw new Error("Invalid theme selection.");
  if (s.themeId && !/^gid:\/\/shopify\/OnlineStoreTheme\/\d+$/.test(s.themeId))
    throw new Error("Choose a Shopify theme.");
  if (
    s.target !== "any" &&
    !new RegExp(
      "^gid://shopify/" +
        (s.target === "product" ? "Product" : "Collection") +
        "/[0-9]+$",
    ).test(s.targetId)
  )
    throw new Error("Select a product or collection.");
  const source = text(s.sourceTemplate, 150, "source template");
  if ((s.keepSections || s.mode !== "full") && !source)
    throw new Error(
      "Select a source JSON template to preserve your existing sections.",
    );
  if (
    source &&
    !new RegExp(
      "^templates/" +
        (s.kind === "home" ? "index" : s.kind) +
        "(\\.[a-zA-Z0-9_-]+)?\\.json$",
    ).test(source)
  )
    throw new Error("Choose a matching JSON template.");
  if (!["Minimal", "Bold", "Editorial"].includes(s.style))
    throw new Error("Invalid layout style.");
  return {
    kind: s.kind,
    mode: s.mode,
    title: text(s.title, 100, "page title", true),
    prompt: text(s.prompt, 4000, "page brief"),
    themeId: s.themeId,
    sourceTemplate: source,
    keepSections: !!s.keepSections,
    target: s.target,
    targetId: s.target === "any" ? "" : s.targetId,
    targetTitle: text(s.targetTitle, 200, "target title"),
    language: text(s.language, 50, "language", true),
    style: s.style,
  };
}
export function validateContent(raw: unknown): PageContent {
  if (!raw || typeof raw !== "object") throw new Error("Invalid page content.");
  const c = raw as PageContent;
  if (
    !Array.isArray(c.sections) ||
    c.sections.length < 1 ||
    c.sections.length > 12
  )
    throw new Error("A page needs 1–12 sections.");
  const ids = new Set<string>();
  const sections = c.sections.map((s) => {
    if (
      !s ||
      !/^[a-zA-Z0-9_-]{1,50}$/.test(s.id) ||
      ids.has(s.id) ||
      !SECTION_KINDS.includes(s.kind)
    )
      throw new Error("Invalid or duplicate section.");
    ids.add(s.id);
    if (!Array.isArray(s.items) || s.items.length > 8)
      throw new Error("Use up to 8 section items.");
    return {
      id: s.id,
      kind: s.kind,
      heading: text(s.heading, 200, "heading"),
      text: text(s.text, 4000, "section text"),
      image: safeUrl(s.image, true),
      imageAlt: text(s.imageAlt, 200, "image description"),
      button: text(s.button, 80, "button"),
      url: safeUrl(s.url),
      hidden: !!s.hidden,
      items: s.items.map((i) => ({
        title: text(i.title, 200, "item title"),
        text: text(i.text, 1000, "item text"),
      })),
    };
  });
  if (sections.every((s) => s.hidden))
    throw new Error("Keep at least one section visible.");
  return {
    title: text(c.title, 100, "page title", true),
    seoDescription: text(c.seoDescription, 320, "search description"),
    sections,
  };
}
export function newSection(kind: SectionKind): PageSection {
  return {
    id: "s_" + globalThis.crypto.randomUUID().replaceAll("-", "").slice(0, 12),
    kind,
    heading:
      kind === "product" ? "Product information" : "New " + kind + " section",
    text: "",
    image: "",
    imageAlt: "",
    button: "",
    url: "",
    items: [],
    hidden: false,
  };
}
export function blankContent(setup: PageSetup): PageContent {
  return {
    title: setup.title,
    seoDescription: "",
    sections: [
      {
        ...newSection(setup.kind === "product" ? "product" : "hero"),
        heading: setup.title,
      },
    ],
  };
}
export const CONTENT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "seoDescription", "sections"],
  properties: {
    title: { type: "string" },
    seoDescription: { type: "string" },
    sections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "id",
          "kind",
          "heading",
          "text",
          "image",
          "imageAlt",
          "button",
          "url",
          "items",
          "hidden",
        ],
        properties: {
          id: { type: "string" },
          kind: { type: "string", enum: SECTION_KINDS },
          heading: { type: "string" },
          text: { type: "string" },
          image: { type: "string" },
          imageAlt: { type: "string" },
          button: { type: "string" },
          url: { type: "string" },
          hidden: { type: "boolean" },
          items: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["title", "text"],
              properties: {
                title: { type: "string" },
                text: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
};
