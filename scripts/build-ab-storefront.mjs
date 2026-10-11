import { build } from "esbuild";
await import("./generate-conversion-blocks.mjs");
await build({
  entryPoints: ["app/storefront/ab-storefront.js"],
  outfile: "extensions/ab-storefront/assets/ab-storefront.js",
  minify: true,
  target: "es2020",
  legalComments: "none",
});
