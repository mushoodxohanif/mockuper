-- CreateTable
CREATE TABLE "usage_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workflow" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "user_instructions" TEXT NOT NULL,
    "bria_instruction" TEXT,
    "product_image_url" TEXT,
    "mockup_image_url" TEXT,
    "reference_image_urls" JSONB NOT NULL DEFAULT '[]',
    "output_image_url" TEXT,
    "error_message" TEXT,
    "duration_ms" INTEGER NOT NULL,
    "feedback_sentiment" TEXT,
    "feedback_comment" TEXT,
    "feedback_submitted_at" TIMESTAMPTZ(6),
    "feedback_image_url" TEXT,

    CONSTRAINT "usage_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "usage_events_created_at_idx" ON "usage_events"("created_at" DESC);
