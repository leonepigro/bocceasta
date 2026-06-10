-- Rose personali per analisi multi-lega (indipendente dal sistema aste)
CREATE TABLE IF NOT EXISTS my_leagues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  csv_team_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS my_league_players (
  league_id uuid REFERENCES my_leagues(id) ON DELETE CASCADE,
  player_id integer REFERENCES players(id) ON DELETE CASCADE,
  PRIMARY KEY (league_id, player_id)
);

ALTER TABLE my_leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE my_league_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "my_leagues_own" ON my_leagues
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "my_league_players_own" ON my_league_players
  USING (league_id IN (SELECT id FROM my_leagues WHERE user_id = auth.uid()));

CREATE POLICY "my_league_players_insert_own" ON my_league_players FOR INSERT
  WITH CHECK (league_id IN (SELECT id FROM my_leagues WHERE user_id = auth.uid()));

CREATE POLICY "my_league_players_delete_own" ON my_league_players FOR DELETE
  USING (league_id IN (SELECT id FROM my_leagues WHERE user_id = auth.uid()));
