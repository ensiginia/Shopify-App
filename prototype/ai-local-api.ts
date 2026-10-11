import type { Plugin } from "vite";
import { aiService } from "../app/lib/ai-service.server";
export function aiLocalAPI(): Plugin {
  return {
    name: "ai-pages-local-api",
    configureServer(server) {
      server.middlewares.use("/__ai-image", async (req, res) => {
        const id =
          new URL(req.url || "/", "http://127.0.0.1:4173").searchParams.get(
            "id",
          ) || "";
        if (
          !/^(127\.0\.0\.1|localhost):4173$/.test(req.headers.host || "") ||
          !/^[a-f0-9]{32}$/.test(id)
        ) {
          res.statusCode = 404;
          return res.end();
        }
        const image = await aiService.image("local.preview", id);
        if (!image) {
          res.statusCode = 404;
          return res.end();
        }
        res.setHeader("Content-Type", "image/png");
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.end(Buffer.from(image.data, "base64"));
      });
      server.middlewares.use("/__ai", async (req, res) => {
        const send = (status: number, body: unknown) => {
          res.statusCode = status;
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Cache-Control", "no-store");
          res.end(JSON.stringify(body));
        };
        // Local-only tenant; no Shopify session or admin token is used by this preview API.
        const host = req.headers.host || "";
        if (
          !/^(127\.0\.0\.1|localhost):4173$/.test(host) ||
          req.headers["x-ai-local"] !== "1"
        )
          return send(403, { error: "Local workspace request required." });
        if (
          req.headers.origin &&
          !["http://127.0.0.1:4173", "http://localhost:4173"].includes(
            req.headers.origin,
          )
        )
          return send(403, { error: "Cross-origin requests are unavailable." });
        if (req.method === "GET") {
          try {
            const id = new URL(
              req.url || "/",
              "http://127.0.0.1:4173",
            ).searchParams.get("export");
            if (id)
              return send(200, {
                files: await aiService.exportPage("local.preview", id),
              });
            return send(200, await aiService.workspace("local.preview"));
          } catch {
            return send(503, {
              error:
                "AI database is unavailable. Run npm run setup and restart the preview.",
            });
          }
        }
        if (req.method !== "POST")
          return send(405, { error: "Unsupported method." });
        try {
          let raw = "";
          for await (const chunk of req) {
            raw += chunk.toString();
            if (raw.length > 100000)
              return send(413, { error: "Page request is too large." });
          }
          const body = JSON.parse(raw);
          if (
            !body ||
            typeof body.intent !== "string" ||
            !body.payload ||
            typeof body.payload !== "object" ||
            Array.isArray(body.payload)
          )
            throw new Error("Invalid page action.");
          return send(
            200,
            await aiService.command(
              "local.preview",
              undefined,
              body.intent,
              body.payload,
            ),
          );
        } catch (error) {
          return send(400, { error: (error as Error).message });
        }
      });
    },
  };
}
