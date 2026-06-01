import { generateMockup } from "./mockup.js";
import { parseMockupMultipart } from "./parse-multipart.js";

export async function handleMockupRequest(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { product, mockup } = await parseMockupMultipart(req);

    if (!product || !mockup) {
      return Response.json({ error: "Missing required product or mockup files." }, { status: 400 });
    }

    const { image, instruction } = await generateMockup(product, mockup);
    return Response.json({ image, instruction });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to generate mockup";
    console.error("Mockup processing error:", error);
    return Response.json({ error: message }, { status: 500 });
  }
}
