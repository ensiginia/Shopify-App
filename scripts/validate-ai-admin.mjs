import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
const base =
  "C:/Users/LaptopWala/.codex/plugins/cache/openai-curated-remote/shopify/4.1.1/skills/";
mkdirSync("node_modules/.cache", { recursive: true });
const source = readFileSync("app/lib/ai-shopify.server.ts", "utf8"),
  tick = String.fromCharCode(96);
const queries = [
  ...source.matchAll(new RegExp(tick + "#graphql([\\s\\S]*?)" + tick, "g")),
]
  .map((m) => m[1])
  .join("\n");
writeFileSync("node_modules/.cache/ai-pages.graphql", queries);
const prompt =
  "next jo wo is AI page ko fully functional krna ha&#x20;\nHow it works pa click kr ka video watch  kro&#x20;\nfully functional ai we needed\nstep by step each function feature ko add kro ";
const args = [
  "--model",
  "GPT-6",
  "--client-name",
  "codex",
  "--client-version",
  "1",
  "--artifact-id",
  "ai-pages-admin",
  "--revision",
  "3",
  "--user-prompt-base64",
  Buffer.from(prompt).toString("base64"),
  "--version",
  "2026-10",
];
const result = spawnSync(
  process.execPath,
  [
    base + "shopify-admin/scripts/validate.mjs",
    "--file",
    "node_modules/.cache/ai-pages.graphql",
    ...args,
  ],
  {
    stdio: "inherit",
    env: { ...process.env, OPT_OUT_INSTRUMENTATION: "true" },
  },
);
process.exitCode = result.status ?? 1;
