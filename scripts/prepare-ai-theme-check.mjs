import { build } from "esbuild";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
await build({
  entryPoints: ["app/lib/ai-export.ts"],
  outfile: "node_modules/.cache/ai-theme-export.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
});
const { themeFiles } =
  await import("../node_modules/.cache/ai-theme-export.mjs");
const directory = resolve("node_modules/.cache/ai-theme");
const setup = {
  kind: "product",
  mode: "full",
  title: "Test product",
  prompt: "",
  themeId: "",
  sourceTemplate: "",
  keepSections: false,
  target: "any",
  targetId: "",
  targetTitle: "",
  language: "English",
  style: "Minimal",
};
const content = {
  title: "Test product",
  seoDescription: "",
  sections: [
    {
      id: "product",
      kind: "product",
      heading: "Product",
      text: "",
      image: "",
      imageAlt: "",
      button: "",
      url: "",
      items: [],
      hidden: false,
    },
  ],
};
const files = themeFiles("validation", setup, content, {
  name: "",
  voice: "",
  audience: "",
  color: "#172d32",
  background: "#ffffff",
  style: "Minimal",
});
files["layout/theme.liquid"] =
  "<html><head>{{ content_for_header }}</head><body>{{ content_for_layout }}</body></html>";
files["config/settings_schema.json"] = "[]";
files["locales/en.default.json"] = "{}";
files["locales/en.default.schema.json"] = "{}";
for (const [path, body] of Object.entries(files)) {
  const dest = resolve(directory, path);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, body);
}
console.log(directory);
