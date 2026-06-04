import { getPrisma } from "./db";
import { uploadToImgbb } from "./imgbb";
import type { GenerateMode, UploadFile } from "./mockup";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_FEEDBACK_COMMENT_LENGTH = 2000;

export type UsageLogInput = {
  workflow: "mockup" | "product_edit";
  mode: GenerateMode;
  status: "success" | "error";
  userInstructions: string;
  briaInstruction?: string | null;
  product?: UploadFile;
  mockup?: UploadFile;
  references?: UploadFile[];
  outputDataUrl?: string | null;
  errorMessage?: string | null;
  durationMs: number;
};

export type FeedbackSentiment = "positive" | "negative";

export class UsageNotFoundError extends Error {
  override name = "UsageNotFoundError";
}

export class UsageFeedbackConflictError extends Error {
  override name = "UsageFeedbackConflictError";
}

function isValidUuid(id: string): boolean {
  return UUID_RE.test(id);
}

export async function recordUsageEvent(payload: UsageLogInput): Promise<string | null> {
  try {
    const [productUrl, mockupUrl, referenceUrls, outputUrl] = await Promise.all([
      payload.product ? uploadToImgbb(payload.product) : Promise.resolve(null),
      payload.mockup ? uploadToImgbb(payload.mockup) : Promise.resolve(null),
      payload.references?.length
        ? Promise.all(payload.references.map((file) => uploadToImgbb(file)))
        : Promise.resolve([] as string[]),
      payload.outputDataUrl ? uploadToImgbb(payload.outputDataUrl) : Promise.resolve(null),
    ]);

    const row = await getPrisma().usageEvent.create({
      data: {
        workflow: payload.workflow,
        mode: payload.mode,
        status: payload.status,
        userInstructions: payload.userInstructions,
        briaInstruction: payload.briaInstruction ?? null,
        productImageUrl: productUrl,
        mockupImageUrl: mockupUrl,
        referenceImageUrls: referenceUrls,
        outputImageUrl: outputUrl,
        errorMessage: payload.errorMessage ?? null,
        durationMs: payload.durationMs,
      },
      select: { id: true },
    });

    return row.id;
  } catch (error) {
    console.error("Failed to record usage event:", error);
    return null;
  }
}

export async function updateFeedback(
  usageId: string,
  input: {
    sentiment: FeedbackSentiment;
    comment?: string | null;
    image?: UploadFile | null;
  },
): Promise<void> {
  if (!isValidUuid(usageId)) {
    throw new UsageNotFoundError("Invalid usage id");
  }

  const sentiment = input.sentiment;
  if (sentiment !== "positive" && sentiment !== "negative") {
    throw new Error('sentiment must be "positive" or "negative"');
  }

  const comment =
    input.comment == null || input.comment === ""
      ? null
      : input.comment.trim().slice(0, MAX_FEEDBACK_COMMENT_LENGTH);

  let feedbackImageUrl: string | null = null;
  if (input.image) {
    feedbackImageUrl = await uploadToImgbb(input.image);
  }

  const prisma = getPrisma();
  const updated = await prisma.usageEvent.updateMany({
    where: {
      id: usageId,
      feedbackSubmittedAt: null,
    },
    data: {
      feedbackSentiment: sentiment,
      feedbackComment: comment,
      feedbackImageUrl,
      feedbackSubmittedAt: new Date(),
    },
  });

  if (updated.count > 0) {
    return;
  }

  const existing = await prisma.usageEvent.findUnique({
    where: { id: usageId },
    select: { feedbackSubmittedAt: true },
  });

  if (!existing) {
    throw new UsageNotFoundError("Usage event not found");
  }

  throw new UsageFeedbackConflictError("Feedback already submitted for this run");
}
