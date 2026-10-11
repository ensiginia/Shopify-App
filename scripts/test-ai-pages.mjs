import { build } from "esbuild";
import { mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
mkdirSync("node_modules/.cache", { recursive: true });
await build({
  entryPoints: ["scripts/ai-pages.test.ts"],
  outfile: "node_modules/.cache/ai-pages.test.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
});
const result = spawnSync(
  process.execPath,
  ["node_modules/.cache/ai-pages.test.mjs"],
  { stdio: "inherit" },
);
process.exitCode = result.status ?? 1;
