-- Tabella target personali per il planner
CREATE TABLE IF NOT EXISTS targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  player_id integer REFERENCES players(id) ON DELETE CASCADE,
  max_price integer NOT NULL DEFAULT 1 CHECK (max_price >= 1),
  created_at timestamptz DEFAULT now(),
  UNIQUE(team_id, player_id)
);

ALTER TABLE targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "targets_select_own" ON targets FOR SELECT
  USING (team_id IN (SELECT id FROM teams WHERE user_id = auth.uid()));

CREATE POLICY "targets_insert_own" ON targets FOR INSERT
  WITH CHECK (team_id IN (SELECT id FROM teams WHERE user_id = auth.uid()));

CREATE POLICY "targets_update_own" ON targets FOR UPDATE
  USING (team_id IN (SELECT id FROM teams WHERE user_id = auth.uid()));

CREATE POLICY "targets_delete_own" ON targets FOR DELETE
  USING (team_id IN (SELECT id FROM teams WHERE user_id = auth.uid()));
