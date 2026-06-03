import { processProductEdit } from "./mockup.js";
import { parseProductEditMultipart } from "./parse-multipart.js";

export async function handleProductEditRequest(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { product, instructions, mode } = await parseProductEditMultipart(req);

    if (!product) {
      return Response.json({ error: "Missing required product image." }, { status: 400 });
    }

    if (!instructions) {
      return Response.json(
        { error: "Missing edit instructions. Describe what to change on the product." },
        { status: 400 },
      );
    }

    const { image, instruction } = await processProductEdit(product, instructions, mode);
    return Response.json({ image, instruction, mode });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to process product edit";
    console.error("Product edit processing error:", error);
    return Response.json({ error: message }, { status: 500 });
  }
}
