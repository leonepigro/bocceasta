-- Abilita RLS su tutte le tabelle
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;
ALTER TABLE roster_requirements ENABLE ROW LEVEL SECURITY;

-- Utenti autenticati possono leggere tutto
CREATE POLICY "auth_read_teams" ON teams FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_players" ON players FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_auctions" ON auctions FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_bids" ON bids FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_config" ON config FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_roster_req" ON roster_requirements FOR SELECT TO authenticated USING (true);

-- Nessun write diretto da client (tutte le writes via SECURITY DEFINER functions o service role)
