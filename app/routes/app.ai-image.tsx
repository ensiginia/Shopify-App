import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { aiService } from "../lib/ai-service.server";
export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!/^[a-f0-9]{32}$/.test(id)) return new Response(null, { status: 404 });
  const image = await aiService.image(session.shop, id);
  if (!image) return new Response(null, { status: 404 });
  return new Response(Buffer.from(image.data, "base64"), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
