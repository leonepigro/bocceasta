-- Tabella autobid
CREATE TABLE autobids (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id  uuid NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  team_id     uuid NOT NULL REFERENCES teams(id),
  max_amount  integer NOT NULL CHECK (max_amount >= 1),
  created_at  timestamptz DEFAULT now(),
  CONSTRAINT unique_autobid UNIQUE (auction_id, team_id)
);

ALTER TABLE autobids ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_autobids" ON autobids FOR SELECT TO authenticated USING (true);

-- Imposta o aggiorna un autobid
CREATE OR REPLACE FUNCTION set_autobid(
  p_auction_id uuid,
  p_team_id    uuid,
  p_max_amount integer
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_auction auctions%ROWTYPE;
BEGIN
  SELECT * INTO v_auction FROM auctions WHERE id = p_auction_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Auction not found'; END IF;
  IF v_auction.status != 'active' THEN RAISE EXCEPTION 'Auction is not active'; END IF;
  IF v_auction.expires_at <= now() THEN RAISE EXCEPTION 'Auction has expired'; END IF;
  IF p_max_amount < 1 THEN RAISE EXCEPTION 'Max must be at least 1'; END IF;
  IF v_auction.current_winner_team_id = p_team_id AND v_auction.current_price >= p_max_amount THEN
    RAISE EXCEPTION 'Max must be greater than current price';
  END IF;

  INSERT INTO autobids (auction_id, team_id, max_amount)
  VALUES (p_auction_id, p_team_id, p_max_amount)
  ON CONFLICT (auction_id, team_id)
  DO UPDATE SET max_amount = p_max_amount;
END;
$$;

-- Rimuovi un autobid
CREATE OR REPLACE FUNCTION remove_autobid(p_auction_id uuid, p_team_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM autobids WHERE auction_id = p_auction_id AND team_id = p_team_id;
END;
$$;

-- place_bid aggiornata con logica autobid
CREATE OR REPLACE FUNCTION place_bid(
  p_auction_id uuid,
  p_team_id    uuid,
  p_amount     integer
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_cfg              config%ROWTYPE;
  v_auction          auctions%ROWTYPE;
  v_team             teams%ROWTYPE;
  v_new_expires      timestamptz;
  v_prev_winner_id   uuid;
  v_autobid_max      integer;
  v_auto_amount      integer;
  v_auto_budget      integer;
BEGIN
  SELECT * INTO v_cfg FROM config WHERE id = 1;
  SELECT * INTO v_auction FROM auctions WHERE id = p_auction_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Auction not found'; END IF;

  SELECT * INTO v_team FROM teams WHERE id = p_team_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Team not found'; END IF;

  IF v_auction.status != 'active' THEN RAISE EXCEPTION 'Auction is not active'; END IF;
  IF v_auction.expires_at <= now() THEN RAISE EXCEPTION 'Auction has expired'; END IF;
  IF p_amount <= v_auction.current_price THEN
    RAISE EXCEPTION 'Bid must be greater than current price (%)', v_auction.current_price;
  END IF;
  IF v_auction.current_winner_team_id = p_team_id THEN
    RAISE EXCEPTION 'You are already the highest bidder';
  END IF;
  IF v_team.budget_remaining < p_amount THEN
    RAISE EXCEPTION 'Insufficient budget';
  END IF;

  v_prev_winner_id := v_auction.current_winner_team_id;

  -- Sblocca budget precedente vincitore
  IF v_prev_winner_id IS NOT NULL THEN
    UPDATE teams SET budget_remaining = budget_remaining + v_auction.current_price
    WHERE id = v_prev_winner_id;
  END IF;

  -- Blocca budget nuovo offerente
  UPDATE teams SET budget_remaining = budget_remaining - p_amount WHERE id = p_team_id;

  -- Calcola expires_at
  v_new_expires := v_auction.expires_at;
  IF now() > v_auction.expires_at - (v_cfg.last_minute_threshold_minutes || ' minutes')::interval THEN
    v_new_expires := v_auction.expires_at + (v_cfg.last_minute_extension_minutes || ' minutes')::interval;
  END IF;

  INSERT INTO bids (auction_id, team_id, amount) VALUES (p_auction_id, p_team_id, p_amount);

  UPDATE auctions
  SET current_price = p_amount,
      current_winner_team_id = p_team_id,
      expires_at = v_new_expires
  WHERE id = p_auction_id;

  -- === AUTOBID del precedente vincitore ===
  IF v_prev_winner_id IS NOT NULL THEN
    SELECT max_amount INTO v_autobid_max
    FROM autobids
    WHERE auction_id = p_auction_id AND team_id = v_prev_winner_id;

    IF FOUND AND v_autobid_max > p_amount THEN
      v_auto_amount := p_amount + 1;

      SELECT budget_remaining INTO v_auto_budget
      FROM teams WHERE id = v_prev_winner_id;

      IF v_auto_budget >= v_auto_amount THEN
        -- Sblocca chi ha appena offerto
        UPDATE teams SET budget_remaining = budget_remaining + p_amount WHERE id = p_team_id;
        -- Blocca il team con autobid
        UPDATE teams SET budget_remaining = budget_remaining - v_auto_amount WHERE id = v_prev_winner_id;

        -- Registra auto-bid
        INSERT INTO bids (auction_id, team_id, amount)
        VALUES (p_auction_id, v_prev_winner_id, v_auto_amount);

        -- Aggiorna asta (controlla again last-minute)
        IF now() > v_new_expires - (v_cfg.last_minute_threshold_minutes || ' minutes')::interval THEN
          v_new_expires := v_new_expires + (v_cfg.last_minute_extension_minutes || ' minutes')::interval;
        END IF;

        UPDATE auctions
        SET current_price = v_auto_amount,
            current_winner_team_id = v_prev_winner_id,
            expires_at = v_new_expires
        WHERE id = p_auction_id;
      END IF;
    END IF;
  END IF;
END;
$$;
