import { defineConfig, loadEnv } from "vite";
import { resourcesLocalAPI } from "./prototype/resources-local-api";
import { conversionLocalAPI } from "./prototype/conversion-local-api";
import { auditLocalAPI } from "./prototype/audit-local-api";
import { aiLocalAPI } from "./prototype/ai-local-api";

const localEnv = loadEnv("development", process.cwd(), "");
for (const key of [
  "OPENAI_API_KEY",
  "AI_MODEL",
  "AI_IMAGE_MODEL",
  "AI_INITIAL_CREDITS",
  "AI_TUTORIAL_URL",
])
  if (!process.env[key] && localEnv[key]) process.env[key] = localEnv[key];

export default defineConfig({
  root: "prototype",
  publicDir: "../public",
  plugins: [aiLocalAPI(), auditLocalAPI(), resourcesLocalAPI(), conversionLocalAPI()],
  server: { host: "127.0.0.1", port: 4173, strictPort: true },
  build: { outDir: "../build/prototype", emptyOutDir: true },
});
