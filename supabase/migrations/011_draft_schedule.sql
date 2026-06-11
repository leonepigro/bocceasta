ALTER TABLE draft_sessions ALTER COLUMN result DROP NOT NULL;
ALTER TABLE draft_sessions ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;
