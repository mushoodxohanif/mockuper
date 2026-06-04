import { processMockup } from "./mockup";
import { parseMockupMultipart } from "./parse-multipart";
import { recordUsageEvent } from "./usage-log";

export async function handleMockupRequest(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  let product: Awaited<ReturnType<typeof parseMockupMultipart>>["product"];
  let mockup: Awaited<ReturnType<typeof parseMockupMultipart>>["mockup"];
  let instructions: string | undefined;
  let mode: Awaited<ReturnType<typeof parseMockupMultipart>>["mode"];
  let startedAt: number | undefined;

  try {
    const parsed = await parseMockupMultipart(req);
    product = parsed.product;
    mockup = parsed.mockup;
    instructions = parsed.instructions;
    mode = parsed.mode;

    if (!product || !mockup) {
      return Response.json({ error: "Missing required product or mockup files." }, { status: 400 });
    }

    startedAt = Date.now();
    const { image, instruction } = await processMockup(product, mockup, instructions ?? "", mode);
    const durationMs = Date.now() - startedAt;

    const usageId = await recordUsageEvent({
      workflow: "mockup",
      mode,
      status: "success",
      userInstructions: instructions,
      briaInstruction: instruction,
      product,
      mockup,
      outputDataUrl: image,
      durationMs,
    });

    return Response.json({ image, instruction, mode, usageId });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to generate mockup";
    console.error("Mockup processing error:", error);

    let usageId: string | null = null;
    if (product && mockup && mode != null && startedAt != null) {
      usageId = await recordUsageEvent({
        workflow: "mockup",
        mode,
        status: "error",
        userInstructions: instructions,
        product,
        mockup,
        errorMessage: message,
        durationMs: Date.now() - startedAt,
      });
    }

    return Response.json({ error: message, usageId }, { status: 500 });
  }
}
