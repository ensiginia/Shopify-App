import { validateContent, validateSetup } from "./ai-pages";
import type { Brand, PageContent, PageSetup } from "./ai-pages";
import { resolveBrand } from "./ai-page-options";
export type ThemeTemplate = {
  sections: Record<string, unknown>;
  order: string[];
  [key: string]: unknown;
};
export const AI_CSS =
  ".aip-section[data-style=Bold] h1,.aip-section[data-style=Bold] h2{font-weight:850;text-transform:uppercase}.aip-section[data-style=Editorial] h1,.aip-section[data-style=Editorial] h2{font-family:Georgia,serif;font-weight:400}.aip-section{color:var(--aip-ink);background:var(--aip-bg);padding:48px 24px}.aip-inner{max-width:1100px;margin:auto}.aip-section h1,.aip-section h2{line-height:1.15;margin:0 0 20px}.aip-section h1{font-size:clamp(32px,5vw,68px)}.aip-section p{white-space:pre-line;line-height:1.7}.aip-hero,.aip-product{display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:center}.aip-section img{width:100%;height:auto;max-height:620px;object-fit:contain}.aip-section a.aip-button,.aip-section button{display:inline-block;border:0;border-radius:8px;padding:14px 22px;background:var(--aip-ink);color:var(--aip-bg);text-decoration:none;cursor:pointer}.aip-items{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:24px}.aip-section details{border-bottom:1px solid #ccc;padding:18px 0}.aip-section label{display:block;margin:16px 0}.aip-section select,.aip-section input{padding:12px;max-width:100%}@media(max-width:700px){.aip-hero,.aip-product{grid-template-columns:1fr}.aip-section{padding:32px 18px}}";
export const AI_SECTION_LIQUID = String.raw`{{ 'aip-pages.css' | asset_url | stylesheet_tag }}
<section class="aip-section" data-style="{{ section.settings.style }}" style="--aip-ink:{{ section.settings.ink }};--aip-bg:{{ section.settings.bg }}">
  <div class="aip-inner {% if section.settings.kind == 'hero' %}aip-hero{% elsif section.settings.kind == 'product' %}aip-product{% endif %}">
    {% if section.settings.kind == 'product' and product != blank %}
      <div>{% if product.featured_image %}{{ product.featured_image | image_url: width: 1200 | image_tag: loading: 'lazy', widths: '400,800,1200' }}{% endif %}</div>
      <div><h1>{{ product.title | escape }}</h1>{% if section.settings.heading != blank %}<h2>{{ section.settings.heading | escape }}</h2>{% endif %}<p>{{ section.settings.copy | escape | newline_to_br }}</p>
      {%- assign product_form_id = 'aip-product-' | append: section.id -%}
      {% form 'product', product, id: product_form_id %}
        <label>Variant<select name="id">{% for variant in product.variants %}<option value="{{ variant.id }}" {% unless variant.available %}disabled{% endunless %} {% if variant == product.selected_or_first_available_variant %}selected{% endif %}>{{ variant.title | escape }} — {{ variant.price | money }}{% unless variant.available %} — Sold out{% endunless %}</option>{% endfor %}</select></label>
        <label>Quantity<input name="quantity" type="number" value="1" min="1" max="99"></label>
        <button type="submit" {% unless product.available %}disabled{% endunless %}>{% if product.available %}{% if section.settings.button != blank %}{{ section.settings.button | escape }}{% else %}Add to cart{% endif %}{% else %}Sold out{% endif %}</button>
        {{ form | payment_button }}
      {% endform %}</div>
    {% else %}
      <div>{% if section.settings.heading != blank %}{% if section.settings.kind == 'hero' %}<h1>{{ section.settings.heading | escape }}</h1>{% else %}<h2>{{ section.settings.heading | escape }}</h2>{% endif %}{% endif %}
      {% if section.settings.copy != blank %}<p>{{ section.settings.copy | escape | newline_to_br }}</p>{% endif %}
      {% if section.settings.kind == 'faq' %}{% for block in section.blocks %}<details {{ block.shopify_attributes }}><summary>{{ block.settings.title | escape }}</summary><p>{{ block.settings.copy | escape | newline_to_br }}</p></details>{% endfor %}
      {% else %}<div class="aip-items">{% for block in section.blocks %}<div {{ block.shopify_attributes }}><h3>{{ block.settings.title | escape }}</h3><p>{{ block.settings.copy | escape | newline_to_br }}</p></div>{% endfor %}</div>{% endif %}
      {% if section.settings.button != blank and section.settings.link != blank %}<a class="aip-button" href="{{ section.settings.link }}">{{ section.settings.button | escape }}</a>{% endif %}</div>
      {% if section.settings.image_asset != blank %}<img src="{{ section.settings.image_asset | asset_url }}" alt="{{ section.settings.image_alt | escape }}" width="1536" height="1024" loading="lazy">{% elsif section.settings.image_url != blank %}<img src="{{ section.settings.image_url | escape }}" alt="{{ section.settings.image_alt | escape }}" width="1200" height="1200" loading="lazy">{% endif %}
    {% endif %}
  </div>
</section>
{% schema %}
{"name":"AI Page section","settings":[{"type":"select","id":"style","label":"Page style","options":[{"value":"Minimal","label":"Minimal"},{"value":"Bold","label":"Bold"},{"value":"Editorial","label":"Editorial"}],"default":"Minimal"},{"type":"select","id":"kind","label":"Layout","options":[{"value":"hero","label":"Hero"},{"value":"text","label":"Text"},{"value":"benefits","label":"Benefits"},{"value":"faq","label":"FAQ"},{"value":"cta","label":"Call to action"},{"value":"product","label":"Product buy box"}],"default":"text"},{"type":"text","id":"heading","label":"Heading"},{"type":"textarea","id":"copy","label":"Text"},{"type":"text","id":"image_asset","label":"Theme image asset"},{"type":"text","id":"image_url","label":"Image URL"},{"type":"text","id":"image_alt","label":"Image description"},{"type":"text","id":"button","label":"Button label"},{"type":"url","id":"link","label":"Button link"},{"type":"color","id":"ink","label":"Text and button color","default":"#172d32"},{"type":"color","id":"bg","label":"Background","default":"#ffffff"}],"blocks":[{"type":"item","name":"Content item","settings":[{"type":"text","id":"title","label":"Title"},{"type":"textarea","id":"copy","label":"Text"}]}],"max_blocks":8,"presets":[{"name":"AI Page section"}]}
{% endschema %}
`;
export function parseTemplate(source: string): ThemeTemplate {
  const value = JSON.parse(source.replace(/^\s*\/\*[\s\S]*?\*\//, ""));
  if (
    !value ||
    typeof value.sections !== "object" ||
    Array.isArray(value.sections) ||
    !Array.isArray(value.order) ||
    value.order.some(
      (id: unknown) => typeof id !== "string" || !value.sections[id as string],
    )
  )
    throw new Error("Source is not a valid JSON theme template.");
  return value;
}
export function templateFor(
  setupInput: PageSetup,
  contentInput: PageContent,
  brand: Brand,
  source?: ThemeTemplate,
): ThemeTemplate {
  brand = resolveBrand(brand);
  const setup = validateSetup(setupInput),
    content = validateContent(contentInput);
  const sections: Record<string, unknown> = {};
  let order: string[] = [];
  if (setup.kind === "product" && setup.mode !== "full" && !source)
    throw new Error(
      "A source product template is required to preserve your existing sections.",
    );
  if (source && (setup.keepSections || setup.mode !== "full")) {
    for (const id of source.order)
      sections[id] = structuredClone(source.sections[id]);
    order = [...source.order];
    if (setup.kind === "product" && setup.mode === "buy-box") {
      const candidates = order.filter(
        (id) =>
          /(^|[-_])(?:main[-_])?product($|[-_])/.test(
            String((sections[id] as { type?: string }).type),
          ) || (sections[id] as { type?: string }).type === "main-product",
      );
      if (candidates.length !== 1)
        throw new Error(
          "Could not identify one product buy box. Use a compatible JSON template or full-page mode.",
        );
      const index = order.indexOf(candidates[0]);
      delete sections[candidates[0]];
      order.splice(index, 1, "__aip_buybox__");
    }
  }
  const additions: string[] = [];
  for (const s of content.sections.filter((s) => !s.hidden)) {
    let id = "aip_" + s.id;
    while (sections[id]) id += "_new";
    const blockIds = s.items.map((_, i) => "item" + i);
    sections[id] = {
      type: "aip-page",
      settings: {
        kind: s.kind,
        heading: s.heading,
        copy: s.text,
        image_url: s.image,
        image_alt: s.imageAlt,
        button: s.button,
        link: s.url || "",
        style: setup.style,
        ink: brand.color,
        bg: brand.background,
      },
      blocks: Object.fromEntries(
        s.items.map((i, n) => [
          blockIds[n],
          { type: "item", settings: { title: i.title, copy: i.text } },
        ]),
      ),
      block_order: blockIds,
    };
    additions.push(id);
  }
  if (setup.mode === "buy-box")
    order = order.flatMap((id) => (id === "__aip_buybox__" ? additions : [id]));
  else if (setup.mode === "sections") order.push(...additions);
  else order = [...additions, ...order];
  if (order.length > 25)
    throw new Error(
      "Shopify allows up to 25 sections. Remove some sections or disable preservation.",
    );
  return { ...(source || {}), sections, order };
}
export function themeFiles(
  id: string,
  setup: PageSetup,
  content: PageContent,
  brand: Brand,
  source?: ThemeTemplate,
) {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error("Invalid page identifier.");
  const prefix = setup.kind === "home" ? "index" : setup.kind;
  return {
    "sections/aip-page.liquid": AI_SECTION_LIQUID,
    "assets/aip-pages.css": AI_CSS,
    ["templates/" + prefix + ".aip-" + id + ".json"]: JSON.stringify(
      templateFor(setup, content, brand, source),
      null,
      2,
    ),
  };
}
export function zipFiles(
  files: Record<string, string | Uint8Array>,
): Uint8Array {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  const crc = (bytes: Uint8Array) => {
    let n = 0xffffffff;
    for (const b of bytes) {
      n ^= b;
      for (let i = 0; i < 8; i++) n = (n >>> 1) ^ (n & 1 ? 0xedb88320 : 0);
    }
    return (n ^ 0xffffffff) >>> 0;
  };
  const header = (size: number) => {
    const bytes = new Uint8Array(size);
    return { bytes, view: new DataView(bytes.buffer) };
  };
  for (const [name, body] of Object.entries(files)) {
    const filename = encoder.encode(name),
      data = typeof body === "string" ? encoder.encode(body) : body,
      sum = crc(data);
    const h = header(30);
    h.view.setUint32(0, 0x04034b50, true);
    h.view.setUint16(4, 20, true);
    h.view.setUint16(6, 0x800, true);
    h.view.setUint32(14, sum, true);
    h.view.setUint32(18, data.length, true);
    h.view.setUint32(22, data.length, true);
    h.view.setUint16(26, filename.length, true);
    chunks.push(h.bytes, filename, data);
    const c = header(46);
    c.view.setUint32(0, 0x02014b50, true);
    c.view.setUint16(4, 20, true);
    c.view.setUint16(6, 20, true);
    c.view.setUint16(8, 0x800, true);
    c.view.setUint32(16, sum, true);
    c.view.setUint32(20, data.length, true);
    c.view.setUint32(24, data.length, true);
    c.view.setUint16(28, filename.length, true);
    c.view.setUint32(42, offset, true);
    central.push(c.bytes, filename);
    offset += 30 + filename.length + data.length;
  }
  const centralSize = central.reduce((n, b) => n + b.length, 0),
    end = header(22);
  end.view.setUint32(0, 0x06054b50, true);
  end.view.setUint16(8, Object.keys(files).length, true);
  end.view.setUint16(10, Object.keys(files).length, true);
  end.view.setUint32(12, centralSize, true);
  end.view.setUint32(16, offset, true);
  const bytes = new Uint8Array(offset + centralSize + 22);
  let cursor = 0;
  for (const b of [...chunks, ...central, end.bytes]) {
    bytes.set(b, cursor);
    cursor += b.length;
  }
  return bytes;
}
