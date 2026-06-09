-- =============================================
-- launch_auction: lancia una nuova asta
-- =============================================
CREATE OR REPLACE FUNCTION launch_auction(
  p_player_id integer,
  p_team_id   uuid,
  p_initial_bid integer
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_cfg   config%ROWTYPE;
  v_team  teams%ROWTYPE;
  v_player players%ROWTYPE;
  v_active_total integer;
  v_active_team  integer;
  v_auction_id   uuid;
BEGIN
  SELECT * INTO v_cfg FROM config WHERE id = 1;
  SELECT * INTO v_team FROM teams WHERE id = p_team_id FOR UPDATE;
  SELECT * INTO v_player FROM players WHERE id = p_player_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Player not found'; END IF;
  IF v_player.is_sold THEN RAISE EXCEPTION 'Player already sold'; END IF;
  IF NOT (v_player.roles && v_cfg.enabled_roles) THEN
    RAISE EXCEPTION 'Player role not enabled for auction';
  END IF;
  IF EXISTS (SELECT 1 FROM auctions WHERE player_id = p_player_id AND status = 'active') THEN
    RAISE EXCEPTION 'Player already in active auction';
  END IF;

  SELECT COUNT(*) INTO v_active_total FROM auctions WHERE status = 'active';
  IF v_active_total >= v_cfg.max_active_auctions_total THEN
    RAISE EXCEPTION 'Maximum total active auctions reached';
  END IF;

  SELECT COUNT(*) INTO v_active_team FROM auctions
  WHERE status = 'active' AND started_by_team_id = p_team_id;
  IF v_active_team >= v_cfg.max_active_auctions_per_team THEN
    RAISE EXCEPTION 'Maximum active auctions per team reached';
  END IF;

  IF p_initial_bid < 1 THEN RAISE EXCEPTION 'Initial bid must be at least 1'; END IF;
  IF v_team.budget_remaining < p_initial_bid THEN RAISE EXCEPTION 'Insufficient budget'; END IF;

  -- Blocca budget
  UPDATE teams SET budget_remaining = budget_remaining - p_initial_bid WHERE id = p_team_id;

  -- Crea asta
  INSERT INTO auctions (player_id, started_by_team_id, status, current_price, current_winner_team_id, expires_at)
  VALUES (
    p_player_id, p_team_id, 'active', p_initial_bid, p_team_id,
    now() + (v_cfg.auction_duration_hours || ' hours')::interval
  )
  RETURNING id INTO v_auction_id;

  -- Registra offerta iniziale
  INSERT INTO bids (auction_id, team_id, amount) VALUES (v_auction_id, p_team_id, p_initial_bid);

  RETURN v_auction_id;
END;
$$;

-- =============================================
-- place_bid: rilancia su un'asta esistente
-- =============================================
CREATE OR REPLACE FUNCTION place_bid(
  p_auction_id uuid,
  p_team_id    uuid,
  p_amount     integer
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_cfg     config%ROWTYPE;
  v_auction auctions%ROWTYPE;
  v_new_expires timestamptz;
BEGIN
  SELECT * INTO v_cfg FROM config WHERE id = 1;
  SELECT * INTO v_auction FROM auctions WHERE id = p_auction_id FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Auction not found'; END IF;
  IF v_auction.status != 'active' THEN RAISE EXCEPTION 'Auction is not active'; END IF;
  IF v_auction.expires_at <= now() THEN RAISE EXCEPTION 'Auction has expired'; END IF;
  IF p_amount <= v_auction.current_price THEN
    RAISE EXCEPTION 'Bid must be greater than current price (%)', v_auction.current_price;
  END IF;
  IF v_auction.current_winner_team_id = p_team_id THEN
    RAISE EXCEPTION 'You are already the highest bidder';
  END IF;
  IF (SELECT budget_remaining FROM teams WHERE id = p_team_id FOR UPDATE) < p_amount THEN
    RAISE EXCEPTION 'Insufficient budget';
  END IF;

  -- Sblocca budget del precedente vincitore
  IF v_auction.current_winner_team_id IS NOT NULL THEN
    UPDATE teams SET budget_remaining = budget_remaining + v_auction.current_price
    WHERE id = v_auction.current_winner_team_id;
  END IF;

  -- Blocca budget del nuovo offerente
  UPDATE teams SET budget_remaining = budget_remaining - p_amount WHERE id = p_team_id;

  -- Calcola nuovo expires_at
  v_new_expires := v_auction.expires_at;
  IF now() > v_auction.expires_at - (v_cfg.last_minute_threshold_minutes || ' minutes')::interval THEN
    v_new_expires := v_auction.expires_at + (v_cfg.last_minute_extension_minutes || ' minutes')::interval;
  END IF;

  -- Inserisci offerta
  INSERT INTO bids (auction_id, team_id, amount) VALUES (p_auction_id, p_team_id, p_amount);

  -- Aggiorna asta
  UPDATE auctions
  SET current_price = p_amount,
      current_winner_team_id = p_team_id,
      expires_at = v_new_expires
  WHERE id = p_auction_id;
END;
$$;

-- =============================================
-- cancel_auction: annulla un'asta (admin)
-- =============================================
CREATE OR REPLACE FUNCTION cancel_auction(p_auction_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_auction auctions%ROWTYPE;
BEGIN
  SELECT * INTO v_auction FROM auctions WHERE id = p_auction_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Auction not found'; END IF;
  IF v_auction.status != 'active' THEN RAISE EXCEPTION 'Auction is not active'; END IF;

  -- Sblocca budget vincitore corrente
  IF v_auction.current_winner_team_id IS NOT NULL THEN
    UPDATE teams SET budget_remaining = budget_remaining + v_auction.current_price
    WHERE id = v_auction.current_winner_team_id;
  END IF;

  UPDATE auctions SET status = 'cancelled' WHERE id = p_auction_id;
END;
$$;

-- =============================================
-- close_expired_auctions: chiude aste scadute
-- =============================================
CREATE OR REPLACE FUNCTION close_expired_auctions() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_auction auctions%ROWTYPE;
  v_count   integer := 0;
BEGIN
  FOR v_auction IN
    SELECT * FROM auctions WHERE status = 'active' AND expires_at <= now() FOR UPDATE SKIP LOCKED
  LOOP
    IF v_auction.current_winner_team_id IS NOT NULL THEN
      UPDATE auctions SET status = 'sold' WHERE id = v_auction.id;
      UPDATE players
      SET is_sold = true,
          sold_to_team_id = v_auction.current_winner_team_id,
          sold_price = v_auction.current_price
      WHERE id = v_auction.player_id;
    ELSE
      UPDATE auctions SET status = 'cancelled' WHERE id = v_auction.id;
    END IF;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- =============================================
-- get_distinct_roles: ruoli distinti dai players
-- =============================================
CREATE OR REPLACE FUNCTION get_distinct_roles() RETURNS text[]
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT array_agg(DISTINCT role ORDER BY role)
  FROM (SELECT unnest(roles) AS role FROM players) sub;
$$;
