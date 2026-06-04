import type { UploadFile } from "./mockup";
import { parseFeedbackMultipart } from "./parse-multipart";
import {
  type FeedbackSentiment,
  UsageFeedbackConflictError,
  UsageNotFoundError,
  updateFeedback,
} from "./usage-log";

const USAGE_FEEDBACK_PATH_RE = /^\/api\/usage\/([^/]+)\/feedback\/?$/;

export function extractUsageIdFromPath(req: Request): string | null {
  const match = new URL(req.url).pathname.match(USAGE_FEEDBACK_PATH_RE);
  return match?.[1] ?? null;
}

type FeedbackBody = {
  sentiment?: unknown;
  comment?: unknown;
};

function parseFeedbackBody(
  body: FeedbackBody,
): { sentiment: FeedbackSentiment; comment?: string } | null {
  const sentiment = body.sentiment;
  if (sentiment !== "positive" && sentiment !== "negative") {
    return null;
  }

  let comment: string | undefined;
  if (body.comment != null) {
    if (typeof body.comment !== "string") {
      return null;
    }
    const trimmed = body.comment.trim();
    if (trimmed.length > 0) {
      comment = trimmed;
    }
  }

  return { sentiment, comment };
}

async function parseFeedbackRequest(
  req: Request,
): Promise<{ sentiment: FeedbackSentiment; comment?: string; image?: UploadFile } | null> {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const parsed = await parseFeedbackMultipart(req);
    if (parsed.sentiment !== "positive" && parsed.sentiment !== "negative") {
      return null;
    }

    return {
      sentiment: parsed.sentiment,
      ...(parsed.comment ? { comment: parsed.comment } : {}),
      ...(parsed.image ? { image: parsed.image } : {}),
    };
  }

  let body: FeedbackBody;
  try {
    body = (await req.json()) as FeedbackBody;
  } catch {
    return null;
  }

  return parseFeedbackBody(body);
}

export async function handleUsageFeedbackRequest(
  req: Request,
  usageId?: string,
): Promise<Response> {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const id = usageId ?? extractUsageIdFromPath(req);
  if (!id) {
    return Response.json({ error: "Missing usage id" }, { status: 400 });
  }

  let parsed: Awaited<ReturnType<typeof parseFeedbackRequest>>;
  try {
    parsed = await parseFeedbackRequest(req);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Invalid feedback payload";
    return Response.json({ error: message }, { status: 400 });
  }

  if (!parsed) {
    return Response.json(
      { error: 'Invalid body. "sentiment" must be "positive" or "negative".' },
      { status: 400 },
    );
  }

  try {
    await updateFeedback(id, {
      sentiment: parsed.sentiment,
      comment: parsed.comment ?? null,
      image: parsed.image ?? null,
    });
    return Response.json({ ok: true });
  } catch (error: unknown) {
    if (error instanceof UsageNotFoundError) {
      return Response.json({ error: "Usage event not found" }, { status: 404 });
    }
    if (error instanceof UsageFeedbackConflictError) {
      return Response.json({ error: "Feedback already recorded for this run" }, { status: 409 });
    }

    console.error("Usage feedback error:", error);
    const message = error instanceof Error ? error.message : "Failed to save feedback";
    return Response.json({ error: message }, { status: 500 });
  }
}
