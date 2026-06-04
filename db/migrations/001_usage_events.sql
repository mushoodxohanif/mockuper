-- Legacy manual migration (superseded by prisma/migrations). See README "Database (Neon)".
-- Usage events: log every mockup / product-edit attempt.
-- Images are stored as ImgBB URLs; optional user feedback on the same row.

CREATE TABLE IF NOT EXISTS usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  workflow text NOT NULL,
  mode text NOT NULL,
  status text NOT NULL,
  user_instructions text NOT NULL,
  bria_instruction text,
  product_image_url text,
  mockup_image_url text,
  reference_image_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  output_image_url text,
  error_message text,
  duration_ms integer NOT NULL,
  feedback_sentiment text,
  feedback_comment text,
  feedback_submitted_at timestamptz
);

CREATE INDEX IF NOT EXISTS usage_events_created_at_idx ON usage_events (created_at DESC);
