export function imageProviderReady() {
  return !!process.env.OPENAI_API_KEY && !!process.env.AI_IMAGE_MODEL;
}
export async function generateImage(
  prompt: string,
  fetcher: typeof fetch = fetch,
) {
  if (!imageProviderReady())
    throw new Error(
      "Configure AI_IMAGE_MODEL and the server API key for image generation.",
    );
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 2000)
    throw new Error("Describe an image using 1–2,000 characters.");
  const response = await fetcher(
    "https://api.openai.com/v1/images/generations",
    {
      method: "POST",
      signal: AbortSignal.timeout(90000),
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + process.env.OPENAI_API_KEY,
      },
      body: JSON.stringify({
        model: process.env.AI_IMAGE_MODEL,
        prompt:
          "Create an original illustrative Shopify marketing banner. Do not create testimonials, endorsement logos, text overlays, badges, certifications or a purported photograph of a specific real product. Merchant creative brief: " +
          prompt,
        n: 1,
        size: "1536x1024",
        quality: "low",
        output_format: "png",
      }),
    },
  );
  if (!response.ok)
    throw new Error(
      "AI image generation failed. Check provider model access and quota; your app credit was returned.",
    );
  const body = await response.json(),
    data = body.data?.[0]?.b64_json;
  if (
    typeof data !== "string" ||
    data.length > 14000000 ||
    !/^[a-zA-Z0-9+/=\r\n]+$/.test(data)
  )
    throw new Error("Provider did not return a valid image.");
  const bytes = Buffer.from(data, "base64");
  if (bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a")
    throw new Error("Provider returned an unsupported image format.");
  return data;
}
