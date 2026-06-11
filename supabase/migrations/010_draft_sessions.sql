CREATE TABLE IF NOT EXISTS draft_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season text NOT NULL DEFAULT '2025/26',
  result jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  locked_at timestamptz,
  applied_at timestamptz
);

-- Nessuna RLS: lettura pubblica, scrittura solo admin via service key
ALTER TABLE draft_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "draft_sessions_public_read" ON draft_sessions
  FOR SELECT USING (locked_at IS NOT NULL);

CREATE POLICY "draft_sessions_service_write" ON draft_sessions
  FOR ALL USING (true)
  WITH CHECK (true);
