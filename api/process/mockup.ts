import type { VercelRequest, VercelResponse } from "@vercel/node";
import { generateMockup } from "../../lib/mockup.js";
import { parseMockupMultipart } from "../../lib/parse-multipart.js";

export const config = {
  api: {
    bodyParser: false,
  },
  maxDuration: 300,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { product, mockup } = await parseMockupMultipart(req);

    if (!product || !mockup) {
      res.status(400).json({ error: "Missing required product or mockup files." });
      return;
    }

    const { image, instruction } = await generateMockup(product, mockup);
    res.status(200).json({ image, instruction });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to generate mockup";
    console.error("Mockup processing error:", error);
    res.status(500).json({ error: message });
  }
}
