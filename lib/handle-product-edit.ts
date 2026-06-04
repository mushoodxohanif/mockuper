import { processProductEdit } from "./mockup";
import { parseProductEditMultipart } from "./parse-multipart";
import { recordUsageEvent } from "./usage-log";

export async function handleProductEditRequest(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  let product: Awaited<ReturnType<typeof parseProductEditMultipart>>["product"];
  let references: Awaited<ReturnType<typeof parseProductEditMultipart>>["references"];
  let instructions: string | undefined;
  let mode: Awaited<ReturnType<typeof parseProductEditMultipart>>["mode"];
  let startedAt: number | undefined;

  try {
    const parsed = await parseProductEditMultipart(req);
    product = parsed.product;
    references = parsed.references;
    instructions = parsed.instructions;
    mode = parsed.mode;

    if (!product) {
      return Response.json({ error: "Missing required product image." }, { status: 400 });
    }

    if (!instructions) {
      return Response.json(
        { error: "Missing edit instructions. Describe what to change on the product." },
        { status: 400 },
      );
    }

    startedAt = Date.now();
    const { image, instruction } = await processProductEdit(
      product,
      instructions,
      mode,
      references,
    );
    const durationMs = Date.now() - startedAt;

    const usageId = await recordUsageEvent({
      workflow: "product_edit",
      mode,
      status: "success",
      userInstructions: instructions,
      briaInstruction: instruction,
      product,
      references,
      outputDataUrl: image,
      durationMs,
    });

    return Response.json({ image, instruction, mode, usageId });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to process product edit";
    console.error("Product edit processing error:", error);

    let usageId: string | null = null;
    if (product && instructions && mode != null && startedAt != null) {
      usageId = await recordUsageEvent({
        workflow: "product_edit",
        mode,
        status: "error",
        userInstructions: instructions,
        product,
        references,
        errorMessage: message,
        durationMs: Date.now() - startedAt,
      });
    }

    return Response.json({ error: message, usageId }, { status: 500 });
  }
}
