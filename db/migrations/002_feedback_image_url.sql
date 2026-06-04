-- Legacy manual migration (superseded by prisma/migrations). See README "Database (Neon)".
-- Optional ImgBB URL for a user-uploaded result image attached to feedback.

ALTER TABLE usage_events
  ADD COLUMN IF NOT EXISTS feedback_image_url text;
