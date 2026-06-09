-- Squadre
CREATE TABLE teams (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users ON DELETE SET NULL,
  team_name       text NOT NULL,
  owner_name      text NOT NULL,
  budget_remaining integer NOT NULL DEFAULT 500 CHECK (budget_remaining >= 0),
  created_at      timestamptz DEFAULT now()
);

-- Calciatori
CREATE TABLE players (
  id              integer PRIMARY KEY,
  name            text NOT NULL,
  serie_a_team    text,
  roles           text[] NOT NULL DEFAULT '{}',
  classic_role    text,
  fvm             integer,
  is_sold         boolean NOT NULL DEFAULT false,
  sold_to_team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  sold_price      integer,
  created_at      timestamptz DEFAULT now()
);

-- Aste
CREATE TABLE auctions (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id              integer NOT NULL REFERENCES players(id),
  started_by_team_id     uuid NOT NULL REFERENCES teams(id),
  status                 text NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active','sold','cancelled')),
  current_price          integer NOT NULL CHECK (current_price >= 1),
  current_winner_team_id uuid REFERENCES teams(id),
  expires_at             timestamptz NOT NULL,
  created_at             timestamptz DEFAULT now()
);

-- Un solo player per volta in asta attiva
CREATE UNIQUE INDEX one_active_auction_per_player
  ON auctions (player_id)
  WHERE status = 'active';

-- Offerte
CREATE TABLE bids (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id  uuid NOT NULL REFERENCES auctions(id),
  team_id     uuid NOT NULL REFERENCES teams(id),
  amount      integer NOT NULL CHECK (amount >= 1),
  placed_at   timestamptz DEFAULT now()
);

-- Configurazione (singola riga id=1)
CREATE TABLE config (
  id                              integer PRIMARY KEY DEFAULT 1
                                  CHECK (id = 1),
  enabled_roles                   text[] NOT NULL DEFAULT '{}',
  max_active_auctions_total       integer NOT NULL DEFAULT 10,
  max_active_auctions_per_team    integer NOT NULL DEFAULT 2,
  auction_duration_hours          integer NOT NULL DEFAULT 24,
  last_minute_extension_minutes   integer NOT NULL DEFAULT 2,
  last_minute_threshold_minutes   integer NOT NULL DEFAULT 1
);

INSERT INTO config (id) VALUES (1);

-- Requisiti rosa
CREATE TABLE roster_requirements (
  id        serial PRIMARY KEY,
  role      text NOT NULL,
  min_count integer NOT NULL,
  max_count integer NOT NULL
);

INSERT INTO roster_requirements (role, min_count, max_count) VALUES
  ('Por', 2, 2),
  ('movement', 25, 28);
