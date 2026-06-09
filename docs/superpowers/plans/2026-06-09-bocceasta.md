# Bocceasta — Asta Fantacalcio Online Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Webapp per asta fantacalcio online stile eBay — 10 partecipanti, self-service filtrata per ruolo Mantra, timer live 24h (+2min last-minute), budget 500 crediti, export fantacalcio.it.

**Architecture:** Next.js 14 App Router + Supabase (PostgreSQL + Auth + Realtime + Edge Functions). Mutations atomiche via stored procedure PostgreSQL (SECURITY DEFINER). Real-time auction updates via Supabase Realtime subscriptions sulla tabella `bids`. Cron Edge Function chiude aste scadute ogni minuto.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Supabase, xlsx (Excel parse), Vitest (unit tests), Vercel (deploy)

---

## File Structure

```
bocceasta/
├── app/
│   ├── layout.tsx                        # root layout, Supabase provider
│   ├── page.tsx                          # redirect → /login o /dashboard
│   ├── login/
│   │   └── page.tsx                      # form email+password
│   ├── dashboard/
│   │   ├── page.tsx                      # server component, carica team + config
│   │   └── _components/
│   │       ├── BudgetHeader.tsx          # nome squadra, budget, contatore rosa
│   │       ├── AuctionCard.tsx           # card asta: timer live, offerente, rilancio
│   │       ├── AuctionList.tsx           # lista aste con subscription Realtime
│   │       ├── LaunchAuction.tsx         # search giocatori + form lancio
│   │       └── MyRoster.tsx              # tab rosa acquistata per ruolo Mantra
│   └── admin/
│       ├── page.tsx                      # server component, verifica ruolo admin
│       └── _components/
│           ├── AdminSidebar.tsx          # sidebar con sezioni
│           ├── ImportSection.tsx         # upload xlsx, parse, upsert
│           ├── RolesSection.tsx          # multiselect ruoli abilitati
│           ├── ConfigSection.tsx         # timer, limiti aste
│           ├── AuctionsSection.tsx       # lista aste attive + annulla
│           ├── TeamsSection.tsx          # crea/modifica 10 team
│           └── ExportSection.tsx         # download CSV fantacalcio.it
├── lib/
│   ├── supabase/
│   │   ├── client.ts                     # createBrowserClient
│   │   ├── server.ts                     # createServerClient (cookies)
│   │   └── types.ts                      # Database types (manually defined)
│   ├── auction/
│   │   ├── actions.ts                    # server actions: launchAuction, placeBid, cancelAuction
│   │   └── validation.ts                 # pure validation functions (unit-testable)
│   ├── players/
│   │   ├── import.ts                     # parsePlayersXlsx(buffer) → PlayerImport[]
│   │   └── queries.ts                    # searchPlayers(query, enabledRoles)
│   └── export/
│       └── csv.ts                        # generateExportCsv(players) → string
├── middleware.ts                         # auth guard su /dashboard e /admin
├── supabase/
│   ├── migrations/
│   │   ├── 001_schema.sql               # tabelle
│   │   ├── 002_rls.sql                  # Row Level Security
│   │   └── 003_functions.sql            # stored procedures RPCs
│   └── functions/
│       └── close-auctions/
│           └── index.ts                 # Edge Function cron ogni minuto
├── tests/
│   ├── import.test.ts
│   ├── validation.test.ts
│   └── csv.test.ts
├── .env.local.example
├── vitest.config.ts
└── next.config.ts
```

---

## Task 1: Scaffold Next.js project

**Files:**
- Create: `package.json`, `next.config.ts`, `tailwind.config.ts`, `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.env.local.example`

- [ ] **Step 1: Crea il progetto Next.js**

```bash
cd C:\sviluppo\bocceasta
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*"
```

Risposta ai prompt: accetta i default (ESLint sì, no Turbopack se chiede).

- [ ] **Step 2: Installa dipendenze**

```bash
npm install @supabase/supabase-js @supabase/ssr xlsx
npm install -D vitest @vitejs/plugin-react vite-tsconfig-paths
```

- [ ] **Step 3: Configura Vitest**

Crea `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
```

- [ ] **Step 4: Aggiungi script test a package.json**

Nel `package.json` aggiungi dentro `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Crea .env.local.example**

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

- [ ] **Step 6: Crea .gitignore entry per .env.local**

Verifica che `.env.local` sia in `.gitignore` (create-next-app lo include già).

- [ ] **Step 7: Verifica che il progetto compili**

```bash
npm run build
```

Expected: build success.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with Supabase and Vitest"
```

---

## Task 2: Crea progetto Supabase e configura env

**Files:**
- Create: `.env.local`

- [ ] **Step 1: Crea progetto Supabase**

Vai su https://supabase.com → New project. Scegli una region europea (Frankfurt).

- [ ] **Step 2: Copia credenziali**

Dashboard Supabase → Settings → API:
- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role secret` → `SUPABASE_SERVICE_ROLE_KEY`

- [ ] **Step 3: Crea .env.local**

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

- [ ] **Step 4: Installa Supabase CLI**

```bash
npm install -D supabase
npx supabase login
npx supabase init
npx supabase link --project-ref <project-ref>
```

Il project-ref è il sottodominio del tuo URL (es. `xxxx` da `https://xxxx.supabase.co`).

---

## Task 3: Database migration — schema tabelle

**Files:**
- Create: `supabase/migrations/001_schema.sql`

- [ ] **Step 1: Crea il file di migration**

Crea `supabase/migrations/001_schema.sql`:

```sql
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
  created_at             timestamptz DEFAULT now(),
  CONSTRAINT one_active_per_player UNIQUE NULLS NOT DISTINCT (player_id, status)
    -- workaround: use partial unique index below instead
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
```

- [ ] **Step 2: Applica la migration**

```bash
npx supabase db push
```

Expected: migration applied successfully.

- [ ] **Step 3: Verifica le tabelle nel dashboard Supabase**

Vai su Table Editor — verifica che compaiano: `teams`, `players`, `auctions`, `bids`, `config`, `roster_requirements`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/001_schema.sql
git commit -m "feat: add database schema migration"
```

---

## Task 4: Database migration — RLS policies

**Files:**
- Create: `supabase/migrations/002_rls.sql`

- [ ] **Step 1: Crea il file**

Crea `supabase/migrations/002_rls.sql`:

```sql
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
```

- [ ] **Step 2: Applica**

```bash
npx supabase db push
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/002_rls.sql
git commit -m "feat: add RLS policies — authenticated read-only, writes via RPCs"
```

---

## Task 5: Database migration — stored procedures (RPCs)

**Files:**
- Create: `supabase/migrations/003_functions.sql`

- [ ] **Step 1: Crea il file**

Crea `supabase/migrations/003_functions.sql`:

```sql
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
    UPDATE auctions SET status = 'sold' WHERE id = v_auction.id;

    IF v_auction.current_winner_team_id IS NOT NULL THEN
      UPDATE players
      SET is_sold = true,
          sold_to_team_id = v_auction.current_winner_team_id,
          sold_price = v_auction.current_price
      WHERE id = v_auction.player_id;
    ELSE
      -- Nessun offerente: rimette il giocatore disponibile (già disponibile, niente da fare)
      UPDATE auctions SET status = 'cancelled' WHERE id = v_auction.id;
    END IF;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;
```

- [ ] **Step 2: Applica**

```bash
npx supabase db push
```

- [ ] **Step 3: Verifica nel SQL Editor di Supabase**

```sql
SELECT launch_auction(4431, (SELECT id FROM teams LIMIT 1), 1);
```

Expected: errore `Player role not enabled for auction` (config.enabled_roles è vuoto).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/003_functions.sql
git commit -m "feat: add stored procedures for auction lifecycle"
```

---

## Task 6: TypeScript types e Supabase clients

**Files:**
- Create: `lib/supabase/types.ts`
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`

- [ ] **Step 1: Crea types.ts**

Crea `lib/supabase/types.ts`:

```typescript
export type Team = {
  id: string
  user_id: string | null
  team_name: string
  owner_name: string
  budget_remaining: number
  created_at: string
}

export type Player = {
  id: number
  name: string
  serie_a_team: string | null
  roles: string[]
  classic_role: string | null
  fvm: number | null
  is_sold: boolean
  sold_to_team_id: string | null
  sold_price: number | null
  created_at: string
}

export type AuctionStatus = 'active' | 'sold' | 'cancelled'

export type Auction = {
  id: string
  player_id: number
  started_by_team_id: string
  status: AuctionStatus
  current_price: number
  current_winner_team_id: string | null
  expires_at: string
  created_at: string
}

export type AuctionWithPlayer = Auction & {
  players: Pick<Player, 'id' | 'name' | 'serie_a_team' | 'roles' | 'fvm'>
  teams_winner: Pick<Team, 'id' | 'team_name'> | null
}

export type Bid = {
  id: string
  auction_id: string
  team_id: string
  amount: number
  placed_at: string
}

export type Config = {
  id: number
  enabled_roles: string[]
  max_active_auctions_total: number
  max_active_auctions_per_team: number
  auction_duration_hours: number
  last_minute_extension_minutes: number
  last_minute_threshold_minutes: number
}

export type RosterRequirement = {
  id: number
  role: string
  min_count: number
  max_count: number
}

export type PlayerImport = {
  id: number
  name: string
  serie_a_team: string | null
  roles: string[]
  classic_role: string | null
  fvm: number | null
}
```

- [ ] **Step 2: Crea client.ts (browser)**

Crea `lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 3: Crea server.ts (server components e server actions)**

Crea `lib/supabase/server.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

export async function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}
```

- [ ] **Step 4: Verifica TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add lib/supabase/
git commit -m "feat: add Supabase clients and TypeScript types"
```

---

## Task 7: Middleware + Login page

**Files:**
- Create: `middleware.ts`
- Create: `app/login/page.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Crea middleware.ts**

Crea `middleware.ts` nella root:

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  if (!user && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (!user && pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

- [ ] **Step 2: Crea app/page.tsx (redirect)**

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')
  redirect('/login')
}
```

- [ ] **Step 3: Crea app/login/page.tsx**

```typescript
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <Image src="/fc-boccea-logo_ufficiale.png" alt="FC Boccea" width={120} height={120} />
        </div>
        <h1 className="text-xl font-bold text-center mb-6">Asta FC Boccea</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold disabled:opacity-50"
          >
            {loading ? 'Accesso...' : 'Accedi'}
          </button>
        </form>
      </div>
    </main>
  )
}
```

- [ ] **Step 4: Copia il logo nella cartella public**

```bash
copy C:\sviluppo\bocceasta\fc-boccea-logo_ufficiale.png C:\sviluppo\bocceasta\public\fc-boccea-logo_ufficiale.png
```

- [ ] **Step 5: Avvia dev server e verifica login**

```bash
npm run dev
```

Apri http://localhost:3000 — deve redirezionare a /login, mostrare il logo FC Boccea e il form.

- [ ] **Step 6: Commit**

```bash
git add app/ middleware.ts public/
git commit -m "feat: add login page and auth middleware"
```

---

## Task 8: Unit test — Player import parser (TDD)

**Files:**
- Create: `lib/players/import.ts`
- Create: `tests/import.test.ts`

- [ ] **Step 1: Scrivi il test**

Crea `tests/import.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { parsePlayersXlsx } from '@/lib/players/import'
import * as XLSX from 'xlsx'

function makeWorkbook(rows: unknown[][]) {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(rows)
  XLSX.utils.book_append_sheet(wb, ws, 'Tutti')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

describe('parsePlayersXlsx', () => {
  it('parses a single player row correctly', () => {
    const buf = makeWorkbook([
      ['Quotazioni Fantacalcio Stagione 2025 26'],
      ['Id', 'R', 'RM', 'Nome', 'Squadra', 'Qt.A', 'Qt.I', 'Diff.', 'Qt.A M', 'Qt.I M', 'Diff.M', 'FVM', 'FVM M'],
      [4431, 'P', 'Por', 'Carnesecchi', 'Atalanta', 18, 14, 4, 18, 14, 4, 80, 80],
    ])
    const players = parsePlayersXlsx(buf)
    expect(players).toHaveLength(1)
    expect(players[0]).toEqual({
      id: 4431,
      name: 'Carnesecchi',
      serie_a_team: 'Atalanta',
      roles: ['Por'],
      classic_role: 'P',
      fvm: 80,
    })
  })

  it('splits multi-role players by semicolon', () => {
    const buf = makeWorkbook([
      ['Title'],
      ['Id', 'R', 'RM', 'Nome', 'Squadra', 'Qt.A', 'Qt.I', 'Diff.', 'Qt.A M', 'Qt.I M', 'Diff.M', 'FVM', 'FVM M'],
      [999, 'D', 'Dd;Dc', 'TestPlayer', 'Roma', 10, 8, 2, 10, 8, 2, 25, 25],
    ])
    const players = parsePlayersXlsx(buf)
    expect(players[0].roles).toEqual(['Dd', 'Dc'])
  })

  it('skips rows with missing id', () => {
    const buf = makeWorkbook([
      ['Title'],
      ['Id', 'R', 'RM', 'Nome', 'Squadra', 'Qt.A', 'Qt.I', 'Diff.', 'Qt.A M', 'Qt.I M', 'Diff.M', 'FVM', 'FVM M'],
      [null, 'P', 'Por', 'NoId', 'Milan', 5, 3, 2, 5, 3, 2, 10, 10],
      [123, 'A', 'W;A', 'Valid', 'Juventus', 8, 6, 2, 8, 6, 2, 20, 20],
    ])
    const players = parsePlayersXlsx(buf)
    expect(players).toHaveLength(1)
    expect(players[0].id).toBe(123)
  })

  it('handles null fvm gracefully', () => {
    const buf = makeWorkbook([
      ['Title'],
      ['Id', 'R', 'RM', 'Nome', 'Squadra', 'Qt.A', 'Qt.I', 'Diff.', 'Qt.A M', 'Qt.I M', 'Diff.M', 'FVM', 'FVM M'],
      [456, 'C', 'M', 'NullFvm', 'Napoli', 5, 3, 2, 5, 3, 2, null, null],
    ])
    const players = parsePlayersXlsx(buf)
    expect(players[0].fvm).toBeNull()
  })
})
```

- [ ] **Step 2: Esegui il test — deve fallire**

```bash
npm test
```

Expected: FAIL — `Cannot find module '@/lib/players/import'`

- [ ] **Step 3: Implementa parsePlayersXlsx**

Crea `lib/players/import.ts`:

```typescript
import * as XLSX from 'xlsx'
import type { PlayerImport } from '@/lib/supabase/types'

export function parsePlayersXlsx(buffer: Buffer | ArrayBuffer): PlayerImport[] {
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const ws = wb.Sheets['Tutti']
  if (!ws) throw new Error('Sheet "Tutti" not found in Excel file')

  // Row 1 = title, Row 2 = headers, Row 3+ = data
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null }) as unknown[][]

  const dataRows = rows.slice(2) // skip title + header rows

  const players: PlayerImport[] = []
  for (const row of dataRows) {
    const id = row[0]
    if (!id || typeof id !== 'number') continue

    const classicRole = row[1] ? String(row[1]) : null
    const rmRaw = row[2] ? String(row[2]) : ''
    const roles = rmRaw ? rmRaw.split(';').map(r => r.trim()).filter(Boolean) : []
    const name = row[3] ? String(row[3]) : ''
    const serieATeam = row[4] ? String(row[4]) : null
    const fvm = typeof row[11] === 'number' ? row[11] : null

    if (!name) continue

    players.push({ id, name, serie_a_team: serieATeam, roles, classic_role: classicRole, fvm })
  }

  return players
}
```

- [ ] **Step 4: Esegui il test — deve passare**

```bash
npm test
```

Expected: PASS — 4 tests passing.

- [ ] **Step 5: Commit**

```bash
git add lib/players/import.ts tests/import.test.ts
git commit -m "feat: add xlsx player import parser with tests"
```

---

## Task 9: Unit test — Auction validation (TDD)

**Files:**
- Create: `lib/auction/validation.ts`
- Create: `tests/validation.test.ts`

- [ ] **Step 1: Scrivi il test**

Crea `tests/validation.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { validateLaunchAuction, validateBid } from '@/lib/auction/validation'

describe('validateLaunchAuction', () => {
  const base = {
    playerRoles: ['Por'],
    enabledRoles: ['Por'],
    isPlayerSold: false,
    isPlayerInActiveAuction: false,
    teamActiveAuctions: 0,
    totalActiveAuctions: 0,
    maxPerTeam: 2,
    maxTotal: 10,
    initialBid: 1,
    teamBudget: 500,
  }

  it('accepts valid launch', () => {
    expect(validateLaunchAuction(base)).toEqual({ valid: true })
  })

  it('rejects if player sold', () => {
    const r = validateLaunchAuction({ ...base, isPlayerSold: true })
    expect(r.valid).toBe(false)
    expect((r as { valid: false; error: string }).error).toMatch(/sold/i)
  })

  it('rejects if player role not enabled', () => {
    const r = validateLaunchAuction({ ...base, playerRoles: ['Dc'], enabledRoles: ['Por'] })
    expect(r.valid).toBe(false)
    expect((r as { valid: false; error: string }).error).toMatch(/role/i)
  })

  it('rejects if team at max active auctions', () => {
    const r = validateLaunchAuction({ ...base, teamActiveAuctions: 2, maxPerTeam: 2 })
    expect(r.valid).toBe(false)
    expect((r as { valid: false; error: string }).error).toMatch(/team/i)
  })

  it('rejects if total at max active auctions', () => {
    const r = validateLaunchAuction({ ...base, totalActiveAuctions: 10, maxTotal: 10 })
    expect(r.valid).toBe(false)
    expect((r as { valid: false; error: string }).error).toMatch(/total/i)
  })

  it('rejects if insufficient budget', () => {
    const r = validateLaunchAuction({ ...base, initialBid: 50, teamBudget: 30 })
    expect(r.valid).toBe(false)
    expect((r as { valid: false; error: string }).error).toMatch(/budget/i)
  })

  it('rejects bid below 1', () => {
    const r = validateLaunchAuction({ ...base, initialBid: 0 })
    expect(r.valid).toBe(false)
  })

  it('rejects if player already in active auction', () => {
    const r = validateLaunchAuction({ ...base, isPlayerInActiveAuction: true })
    expect(r.valid).toBe(false)
    expect((r as { valid: false; error: string }).error).toMatch(/auction/i)
  })
})

describe('validateBid', () => {
  const futureDate = new Date(Date.now() + 3600_000)
  const base = {
    amount: 10,
    currentPrice: 5,
    teamBudget: 500,
    auctionStatus: 'active' as const,
    auctionExpiresAt: futureDate,
    isCurrentWinner: false,
  }

  it('accepts valid bid', () => {
    expect(validateBid(base)).toEqual({ valid: true })
  })

  it('rejects if auction not active', () => {
    const r = validateBid({ ...base, auctionStatus: 'sold' as const })
    expect(r.valid).toBe(false)
    expect((r as { valid: false; error: string }).error).toMatch(/active/i)
  })

  it('rejects if auction expired', () => {
    const r = validateBid({ ...base, auctionExpiresAt: new Date(Date.now() - 1000) })
    expect(r.valid).toBe(false)
    expect((r as { valid: false; error: string }).error).toMatch(/expir/i)
  })

  it('rejects if bid not greater than current price', () => {
    const r = validateBid({ ...base, amount: 5 })
    expect(r.valid).toBe(false)
    expect((r as { valid: false; error: string }).error).toMatch(/greater/i)
  })

  it('rejects if insufficient budget', () => {
    const r = validateBid({ ...base, amount: 100, teamBudget: 50 })
    expect(r.valid).toBe(false)
    expect((r as { valid: false; error: string }).error).toMatch(/budget/i)
  })

  it('rejects if already the winner', () => {
    const r = validateBid({ ...base, isCurrentWinner: true })
    expect(r.valid).toBe(false)
    expect((r as { valid: false; error: string }).error).toMatch(/winner/i)
  })
})
```

- [ ] **Step 2: Esegui — deve fallire**

```bash
npm test
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implementa validation.ts**

Crea `lib/auction/validation.ts`:

```typescript
import type { AuctionStatus } from '@/lib/supabase/types'

type ValidationResult = { valid: true } | { valid: false; error: string }

export function validateLaunchAuction(params: {
  playerRoles: string[]
  enabledRoles: string[]
  isPlayerSold: boolean
  isPlayerInActiveAuction: boolean
  teamActiveAuctions: number
  totalActiveAuctions: number
  maxPerTeam: number
  maxTotal: number
  initialBid: number
  teamBudget: number
}): ValidationResult {
  if (params.isPlayerSold) return { valid: false, error: 'Player already sold' }
  if (params.isPlayerInActiveAuction) return { valid: false, error: 'Player already in active auction' }
  if (!params.playerRoles.some(r => params.enabledRoles.includes(r)))
    return { valid: false, error: 'Player role not enabled for auction' }
  if (params.teamActiveAuctions >= params.maxPerTeam)
    return { valid: false, error: 'Team max active auctions reached' }
  if (params.totalActiveAuctions >= params.maxTotal)
    return { valid: false, error: 'Total max active auctions reached' }
  if (params.initialBid < 1) return { valid: false, error: 'Initial bid must be at least 1' }
  if (params.teamBudget < params.initialBid) return { valid: false, error: 'Insufficient budget' }
  return { valid: true }
}

export function validateBid(params: {
  amount: number
  currentPrice: number
  teamBudget: number
  auctionStatus: AuctionStatus
  auctionExpiresAt: Date
  isCurrentWinner: boolean
}): ValidationResult {
  if (params.auctionStatus !== 'active') return { valid: false, error: 'Auction is not active' }
  if (params.auctionExpiresAt <= new Date()) return { valid: false, error: 'Auction has expired' }
  if (params.amount <= params.currentPrice)
    return { valid: false, error: 'Bid must be greater than current price' }
  if (params.isCurrentWinner) return { valid: false, error: 'You are already the highest bidder' }
  if (params.teamBudget < params.amount) return { valid: false, error: 'Insufficient budget' }
  return { valid: true }
}
```

- [ ] **Step 4: Esegui — deve passare**

```bash
npm test
```

Expected: PASS — tutti i test passano.

- [ ] **Step 5: Commit**

```bash
git add lib/auction/validation.ts tests/validation.test.ts
git commit -m "feat: add auction validation with tests"
```

---

## Task 10: Server actions — launchAuction e placeBid

**Files:**
- Create: `lib/auction/actions.ts`

- [ ] **Step 1: Crea actions.ts**

Crea `lib/auction/actions.ts`:

```typescript
'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function launchAuction(playerId: number, initialBid: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: team } = await supabase
    .from('teams')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!team) return { error: 'Team not found for user' }

  const { data, error } = await supabase.rpc('launch_auction', {
    p_player_id: playerId,
    p_team_id: team.id,
    p_initial_bid: initialBid,
  })

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return { auctionId: data as string }
}

export async function placeBid(auctionId: string, amount: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: team } = await supabase
    .from('teams')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!team) return { error: 'Team not found for user' }

  const { error } = await supabase.rpc('place_bid', {
    p_auction_id: auctionId,
    p_team_id: team.id,
    p_amount: amount,
  })

  if (error) return { error: error.message }
  return { success: true }
}
```

- [ ] **Step 2: Verifica TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/auction/actions.ts
git commit -m "feat: add launchAuction and placeBid server actions"
```

---

## Task 11: Unit test — CSV export (TDD)

**Files:**
- Create: `lib/export/csv.ts`
- Create: `tests/csv.test.ts`

- [ ] **Step 1: Scrivi il test**

Crea `tests/csv.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { generateExportCsv } from '@/lib/export/csv'

describe('generateExportCsv', () => {
  it('generates correct CSV header', () => {
    const csv = generateExportCsv([])
    expect(csv.split('\n')[0]).toBe('Id;Nome;Squadra;Ruolo;Ruolo Mantra;Qt.A;Fantateam')
  })

  it('generates correct row for sold player', () => {
    const csv = generateExportCsv([{
      id: 4431,
      name: 'Carnesecchi',
      serie_a_team: 'Atalanta',
      classic_role: 'P',
      roles: ['Por'],
      sold_price: 18,
      team_name: 'FC Boccea',
    }])
    const lines = csv.split('\n')
    expect(lines[1]).toBe('4431;Carnesecchi;Atalanta;P;Por;18;FC Boccea')
  })

  it('joins multiple mantra roles with semicolon', () => {
    const csv = generateExportCsv([{
      id: 999,
      name: 'Multi',
      serie_a_team: 'Roma',
      classic_role: 'D',
      roles: ['Dd', 'Dc'],
      sold_price: 10,
      team_name: 'Test FC',
    }])
    expect(csv.split('\n')[1]).toContain('Dd;Dc')
  })

  it('handles null serie_a_team', () => {
    const csv = generateExportCsv([{
      id: 1,
      name: 'Test',
      serie_a_team: null,
      classic_role: 'A',
      roles: ['W'],
      sold_price: 5,
      team_name: 'FC Test',
    }])
    expect(csv.split('\n')[1]).toBe('1;Test;;A;W;5;FC Test')
  })
})
```

- [ ] **Step 2: Esegui — deve fallire**

```bash
npm test
```

Expected: FAIL.

- [ ] **Step 3: Implementa generateExportCsv**

Crea `lib/export/csv.ts`:

```typescript
export type SoldPlayerExport = {
  id: number
  name: string
  serie_a_team: string | null
  classic_role: string | null
  roles: string[]
  sold_price: number
  team_name: string
}

export function generateExportCsv(players: SoldPlayerExport[]): string {
  const header = 'Id;Nome;Squadra;Ruolo;Ruolo Mantra;Qt.A;Fantateam'
  const rows = players.map(p =>
    [
      p.id,
      p.name,
      p.serie_a_team ?? '',
      p.classic_role ?? '',
      p.roles.join(';'),
      p.sold_price,
      p.team_name,
    ].join(';')
  )
  return [header, ...rows].join('\n')
}
```

- [ ] **Step 4: Esegui — deve passare**

```bash
npm test
```

Expected: PASS — tutti i test passano (import + validation + csv).

- [ ] **Step 5: Commit**

```bash
git add lib/export/csv.ts tests/csv.test.ts
git commit -m "feat: add CSV export generator with tests"
```

---

## Task 12: Edge Function — chiusura aste scadute

**Files:**
- Create: `supabase/functions/close-auctions/index.ts`

- [ ] **Step 1: Crea la Edge Function**

Crea `supabase/functions/close-auctions/index.ts`:

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data, error } = await supabase.rpc('close_expired_auctions')

  if (error) {
    console.error('close_expired_auctions error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  console.log(`Closed ${data} expired auctions`)
  return new Response(JSON.stringify({ closed: data }), { status: 200 })
})
```

- [ ] **Step 2: Deploy della Edge Function**

```bash
npx supabase functions deploy close-auctions --no-verify-jwt
```

- [ ] **Step 3: Configura cron nel dashboard Supabase**

Vai su Supabase Dashboard → Edge Functions → close-auctions → Schedule.
Imposta: `* * * * *` (ogni minuto).

In alternativa, usa pg_cron via SQL Editor:

```sql
SELECT cron.schedule(
  'close-expired-auctions',
  '* * * * *',
  $$SELECT net.http_post(
    url := current_setting('app.edge_function_url') || '/close-auctions',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_role_key'))
  )$$
);
```

Nota: il metodo più semplice è usare il tab "Cron Jobs" nel dashboard Supabase → New cron job → HTTP request alla URL della Edge Function.

- [ ] **Step 4: Verifica manuale**

Crea un'asta con `expires_at` nel passato via SQL Editor:

```sql
-- Prima crea un team e un player di test
INSERT INTO teams (team_name, owner_name) VALUES ('Test', 'Test') RETURNING id;
-- Usa l'id restituito in <team_id>
UPDATE config SET enabled_roles = '{Por}' WHERE id = 1;
SELECT launch_auction(4431, '<team_id>', 5);
-- Forza scadenza
UPDATE auctions SET expires_at = now() - interval '1 minute' WHERE status = 'active';
-- Chiama la funzione
SELECT close_expired_auctions();
-- Verifica
SELECT status FROM auctions ORDER BY created_at DESC LIMIT 1;
```

Expected: `sold`.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/
git commit -m "feat: add close-auctions Edge Function with cron"
```

---

## Task 13: Dashboard — layout e BudgetHeader

**Files:**
- Create: `app/dashboard/page.tsx`
- Create: `app/dashboard/_components/BudgetHeader.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Aggiorna app/layout.tsx**

```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Asta FC Boccea',
  description: 'Fantacalcio auction platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
```

- [ ] **Step 2: Crea BudgetHeader.tsx**

Crea `app/dashboard/_components/BudgetHeader.tsx`:

```typescript
'use client'
import type { Team } from '@/lib/supabase/types'

type Props = {
  team: Team
  rosterCount: number
  rosterMin: number
  rosterMax: number
}

export function BudgetHeader({ team, rosterCount, rosterMin, rosterMax }: Props) {
  return (
    <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
      <div>
        <h1 className="font-bold text-lg">{team.team_name}</h1>
        <p className="text-sm text-gray-500">{team.owner_name}</p>
      </div>
      <div className="text-right">
        <p className="text-2xl font-bold text-green-600">{team.budget_remaining} cr</p>
        <p className="text-xs text-gray-500">
          Rosa: {rosterCount} / {rosterMin}-{rosterMax}
        </p>
      </div>
    </header>
  )
}
```

- [ ] **Step 3: Crea app/dashboard/page.tsx**

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BudgetHeader } from './_components/BudgetHeader'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: team }, { data: config }] = await Promise.all([
    supabase.from('teams').select('*').eq('user_id', user.id).single(),
    supabase.from('config').select('*').eq('id', 1).single(),
  ])

  if (!team) return <p className="p-4">Squadra non trovata. Contatta l&apos;admin.</p>

  const { data: soldPlayers } = await supabase
    .from('players')
    .select('id')
    .eq('sold_to_team_id', team.id)

  const rosterCount = soldPlayers?.length ?? 0

  return (
    <div className="min-h-screen bg-gray-50">
      <BudgetHeader
        team={team}
        rosterCount={rosterCount}
        rosterMin={25}
        rosterMax={28}
      />
      <main className="max-w-2xl mx-auto p-4 space-y-6">
        <p className="text-gray-400 text-sm text-center">
          {config?.enabled_roles?.length
            ? `Ruoli abilitati: ${config.enabled_roles.join(', ')}`
            : 'Nessun ruolo abilitato — aspetta l\'admin'}
        </p>
        {/* AuctionList e LaunchAuction aggiunti nei task successivi */}
      </main>
    </div>
  )
}
```

- [ ] **Step 4: Avvia dev e verifica**

```bash
npm run dev
```

Accedi con un account — deve mostrare header con nome squadra e budget. Se non hai ancora un team nel DB, crealo dal SQL Editor:

```sql
UPDATE teams SET user_id = '<auth.users id>' WHERE team_name = 'La tua squadra';
```

- [ ] **Step 5: Commit**

```bash
git add app/
git commit -m "feat: add dashboard layout and budget header"
```

---

## Task 14: AuctionCard con timer live

**Files:**
- Create: `app/dashboard/_components/AuctionCard.tsx`

- [ ] **Step 1: Crea AuctionCard.tsx**

Crea `app/dashboard/_components/AuctionCard.tsx`:

```typescript
'use client'
import { useState, useEffect, useTransition } from 'react'
import type { AuctionWithPlayer, Team } from '@/lib/supabase/types'
import { placeBid } from '@/lib/auction/actions'

type Props = {
  auction: AuctionWithPlayer
  currentTeam: Team
}

function useCountdown(expiresAt: string) {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
  )

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft(Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)))
    }, 1000)
    return () => clearInterval(interval)
  }, [expiresAt])

  return secondsLeft
}

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export function AuctionCard({ auction, currentTeam }: Props) {
  const secondsLeft = useCountdown(auction.expires_at)
  const [bidAmount, setBidAmount] = useState(auction.current_price + 1)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isExpired = secondsLeft === 0
  const isWinning = auction.current_winner_team_id === currentTeam.id
  const isLastMinute = secondsLeft < 60

  function handleBid(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await placeBid(auction.id, bidAmount)
      if (result.error) setError(result.error)
    })
  }

  return (
    <div className={`bg-white rounded-xl shadow p-4 border-l-4 ${isWinning ? 'border-green-500' : 'border-gray-200'}`}>
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="font-bold">{auction.players.name}</p>
          <p className="text-xs text-gray-500">
            {auction.players.roles.join(' · ')} — {auction.players.serie_a_team}
          </p>
        </div>
        <div className="text-right">
          <p className={`text-sm font-mono font-bold ${isLastMinute ? 'text-red-500 animate-pulse' : 'text-gray-600'}`}>
            {isExpired ? 'SCADUTA' : formatTime(secondsLeft)}
          </p>
          {auction.players.fvm && (
            <p className="text-xs text-gray-400">FVM {auction.players.fvm}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl font-bold text-blue-600">{auction.current_price} cr</span>
        {auction.teams_winner && (
          <span className={`text-sm px-2 py-0.5 rounded-full ${isWinning ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
            {isWinning ? '✓ Tu' : auction.teams_winner.team_name}
          </span>
        )}
      </div>

      {!isExpired && !isWinning && (
        <form onSubmit={handleBid} className="flex gap-2">
          <input
            type="number"
            min={auction.current_price + 1}
            max={currentTeam.budget_remaining}
            value={bidAmount}
            onChange={e => setBidAmount(parseInt(e.target.value))}
            className="flex-1 border rounded-lg px-3 py-1.5 text-sm"
          />
          <button
            type="submit"
            disabled={isPending}
            className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-50"
          >
            {isPending ? '...' : 'Rilancia'}
          </button>
        </form>
      )}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/_components/AuctionCard.tsx
git commit -m "feat: add AuctionCard with live countdown timer"
```

---

## Task 15: AuctionList con Realtime subscription

**Files:**
- Create: `app/dashboard/_components/AuctionList.tsx`
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Crea AuctionList.tsx**

Crea `app/dashboard/_components/AuctionList.tsx`:

```typescript
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AuctionWithPlayer, Team } from '@/lib/supabase/types'
import { AuctionCard } from './AuctionCard'

type Props = {
  initialAuctions: AuctionWithPlayer[]
  currentTeam: Team
}

export function AuctionList({ initialAuctions, currentTeam }: Props) {
  const [auctions, setAuctions] = useState<AuctionWithPlayer[]>(initialAuctions)
  const supabase = createClient()

  useEffect(() => {
    async function fetchAuctions() {
      const { data } = await supabase
        .from('auctions')
        .select(`
          *,
          players ( id, name, serie_a_team, roles, fvm ),
          teams_winner:teams!auctions_current_winner_team_id_fkey ( id, team_name )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
      if (data) setAuctions(data as AuctionWithPlayer[])
    }

    const channel = supabase
      .channel('auctions-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'auctions' }, fetchAuctions)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bids' }, fetchAuctions)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase])

  if (auctions.length === 0) {
    return <p className="text-center text-gray-400 py-8">Nessuna asta attiva</p>
  }

  return (
    <section>
      <h2 className="font-semibold mb-3">Aste in corso ({auctions.length})</h2>
      <div className="space-y-3">
        {auctions.map(a => (
          <AuctionCard key={a.id} auction={a} currentTeam={currentTeam} />
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Aggiungi AuctionList a dashboard/page.tsx**

Modifica `app/dashboard/page.tsx` — aggiungi dopo l'import di BudgetHeader:

```typescript
import { AuctionList } from './_components/AuctionList'
```

E sostituisci `{/* AuctionList e LaunchAuction aggiunti nei task successivi */}` con:

```typescript
<AuctionList initialAuctions={activeAuctions ?? []} currentTeam={team} />
```

Aggiungi anche la query per le aste attive nel server component, dopo la query per `soldPlayers`:

```typescript
const { data: activeAuctions } = await supabase
  .from('auctions')
  .select(`
    *,
    players ( id, name, serie_a_team, roles, fvm ),
    teams_winner:teams!auctions_current_winner_team_id_fkey ( id, team_name )
  `)
  .eq('status', 'active')
  .order('created_at', { ascending: false })
```

- [ ] **Step 3: Abilita Realtime su Supabase**

Dashboard Supabase → Database → Replication → abilita Realtime per tabelle `auctions` e `bids`.

- [ ] **Step 4: Verifica nel browser**

Apri due tab, fai un'offerta in una — l'altra deve aggiornarsi senza refresh.

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/
git commit -m "feat: add AuctionList with Realtime subscription"
```

---

## Task 16: LaunchAuction — ricerca e form lancio

**Files:**
- Create: `app/dashboard/_components/LaunchAuction.tsx`
- Create: `lib/players/queries.ts`
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Crea queries.ts**

Crea `lib/players/queries.ts`:

```typescript
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Player } from '@/lib/supabase/types'

export async function searchAvailablePlayers(
  supabase: SupabaseClient,
  query: string,
  enabledRoles: string[]
): Promise<Player[]> {
  if (!query || query.length < 2) return []

  const { data } = await supabase
    .from('players')
    .select('*')
    .eq('is_sold', false)
    .ilike('name', `%${query}%`)
    .overlaps('roles', enabledRoles)
    .limit(10)

  return (data as Player[]) ?? []
}
```

- [ ] **Step 2: Crea LaunchAuction.tsx**

Crea `app/dashboard/_components/LaunchAuction.tsx`:

```typescript
'use client'
import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Player, Config } from '@/lib/supabase/types'
import { launchAuction } from '@/lib/auction/actions'
import { searchAvailablePlayers } from '@/lib/players/queries'

type Props = { config: Config }

export function LaunchAuction({ config }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Player[]>([])
  const [selected, setSelected] = useState<Player | null>(null)
  const [initialBid, setInitialBid] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const supabase = createClient()

  async function handleSearch(value: string) {
    setQuery(value)
    if (value.length < 2) { setResults([]); return }
    const players = await searchAvailablePlayers(supabase, value, config.enabled_roles)
    setResults(players)
  }

  function handleSelect(player: Player) {
    setSelected(player)
    setQuery(player.name)
    setResults([])
  }

  function handleLaunch(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    setError(null)
    startTransition(async () => {
      const result = await launchAuction(selected.id, initialBid)
      if (result.error) {
        setError(result.error)
      } else {
        setSelected(null)
        setQuery('')
        setInitialBid(1)
      }
    })
  }

  if (!config.enabled_roles.length) return null

  return (
    <section className="bg-white rounded-xl shadow p-4">
      <h2 className="font-semibold mb-3">Lancia asta</h2>
      <p className="text-xs text-gray-400 mb-3">
        Ruoli: {config.enabled_roles.join(', ')}
      </p>
      <div className="relative mb-3">
        <input
          type="text"
          placeholder="Cerca giocatore..."
          value={query}
          onChange={e => handleSearch(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm"
        />
        {results.length > 0 && (
          <ul className="absolute z-10 w-full bg-white border rounded-lg shadow mt-1 max-h-48 overflow-y-auto">
            {results.map(p => (
              <li
                key={p.id}
                onClick={() => handleSelect(p)}
                className="px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
              >
                <span className="font-medium">{p.name}</span>
                <span className="text-gray-400 ml-2">{p.roles.join('/')} — {p.serie_a_team}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selected && (
        <form onSubmit={handleLaunch} className="flex gap-2">
          <input
            type="number"
            min={1}
            value={initialBid}
            onChange={e => setInitialBid(parseInt(e.target.value))}
            className="w-24 border rounded-lg px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
          >
            {isPending ? '...' : `Lancia ${selected.name}`}
          </button>
        </form>
      )}
      {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
    </section>
  )
}
```

- [ ] **Step 3: Aggiungi LaunchAuction a dashboard/page.tsx**

Aggiungi import:
```typescript
import { LaunchAuction } from './_components/LaunchAuction'
```

Aggiungi nel JSX dopo `<AuctionList ...>`:
```typescript
{config && <LaunchAuction config={config} />}
```

- [ ] **Step 4: Verifica nel browser**

Cerca un giocatore, selezionalo, inserisci offerta, lancia — deve comparire nell'AuctionList in tempo reale.

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/ lib/players/queries.ts
git commit -m "feat: add LaunchAuction component with player search"
```

---

## Task 17: MyRoster tab

**Files:**
- Create: `app/dashboard/_components/MyRoster.tsx`
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Crea MyRoster.tsx**

Crea `app/dashboard/_components/MyRoster.tsx`:

```typescript
'use client'
import { useState } from 'react'
import type { Player } from '@/lib/supabase/types'

type Props = { players: (Player & { sold_price: number })[] }

export function MyRoster({ players }: Props) {
  const [activeTab, setActiveTab] = useState<'list' | 'roles'>('list')

  const byRole = players.reduce<Record<string, typeof players>>((acc, p) => {
    const primaryRole = p.roles[0] ?? 'Altro'
    if (!acc[primaryRole]) acc[primaryRole] = []
    acc[primaryRole].push(p)
    return acc
  }, {})

  const totalSpent = players.reduce((sum, p) => sum + (p.sold_price ?? 0), 0)

  return (
    <section className="bg-white rounded-xl shadow p-4">
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-semibold">La mia rosa ({players.length})</h2>
        <span className="text-sm text-gray-500">Spesi: {totalSpent} cr</span>
      </div>

      <div className="flex gap-2 mb-3">
        {(['list', 'roles'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`text-xs px-3 py-1 rounded-full ${activeTab === tab ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            {tab === 'list' ? 'Lista' : 'Per ruolo'}
          </button>
        ))}
      </div>

      {activeTab === 'list' && (
        <ul className="space-y-1">
          {players.map(p => (
            <li key={p.id} className="flex justify-between text-sm py-1 border-b last:border-0">
              <span>
                <span className="text-xs text-blue-500 mr-1">{p.roles.join('/')}</span>
                {p.name}
              </span>
              <span className="text-gray-500">{p.sold_price} cr</span>
            </li>
          ))}
        </ul>
      )}

      {activeTab === 'roles' && (
        <div className="space-y-3">
          {Object.entries(byRole).sort().map(([role, ps]) => (
            <div key={role}>
              <p className="text-xs font-semibold text-blue-600 mb-1">{role} ({ps.length})</p>
              <ul className="space-y-0.5">
                {ps.map(p => (
                  <li key={p.id} className="flex justify-between text-sm">
                    <span>{p.name}</span>
                    <span className="text-gray-400">{p.sold_price} cr</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
```

- [ ] **Step 2: Aggiorna dashboard/page.tsx**

Aggiungi import:
```typescript
import { MyRoster } from './_components/MyRoster'
```

Aggiorna la query per `soldPlayers` — aggiungi tutti i campi necessari:

```typescript
const { data: soldPlayers } = await supabase
  .from('players')
  .select('*')
  .eq('sold_to_team_id', team.id)
```

Aggiungi nel JSX dopo `<LaunchAuction ...>`:
```typescript
<MyRoster players={(soldPlayers ?? []) as (Player & { sold_price: number })[]} />
```

Aggiungi import tipo:
```typescript
import type { Player } from '@/lib/supabase/types'
```

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/
git commit -m "feat: add MyRoster tab with role grouping"
```

---

## Task 18: Admin — layout e sidebar

**Files:**
- Create: `app/admin/page.tsx`
- Create: `app/admin/_components/AdminSidebar.tsx`

- [ ] **Step 1: Crea AdminSidebar.tsx**

Crea `app/admin/_components/AdminSidebar.tsx`:

```typescript
'use client'

type Section = 'import' | 'roles' | 'config' | 'auctions' | 'teams' | 'export'

type Props = {
  active: Section
  onChange: (s: Section) => void
}

const sections: { id: Section; label: string }[] = [
  { id: 'import', label: '📥 Import Excel' },
  { id: 'roles', label: '🎭 Ruoli abilitati' },
  { id: 'config', label: '⚙️ Configurazione' },
  { id: 'auctions', label: '🔨 Aste attive' },
  { id: 'teams', label: '👥 Squadre' },
  { id: 'export', label: '📤 Export' },
]

export function AdminSidebar({ active, onChange }: Props) {
  return (
    <nav className="w-48 shrink-0">
      <ul className="space-y-1">
        {sections.map(s => (
          <li key={s.id}>
            <button
              onClick={() => onChange(s.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                active === s.id ? 'bg-blue-600 text-white font-semibold' : 'hover:bg-gray-100'
              }`}
            >
              {s.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
```

- [ ] **Step 2: Crea app/admin/page.tsx**

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminPanel from './_components/AdminPanel'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const isAdmin = user.user_metadata?.role === 'admin'
  if (!isAdmin) redirect('/dashboard')

  const [{ data: config }, { data: teams }, { data: auctions }] = await Promise.all([
    supabase.from('config').select('*').eq('id', 1).single(),
    supabase.from('teams').select('*').order('team_name'),
    supabase
      .from('auctions')
      .select('*, players(name, roles), teams_winner:teams!auctions_current_winner_team_id_fkey(team_name)')
      .eq('status', 'active')
      .order('expires_at'),
  ])

  return <AdminPanel config={config} teams={teams ?? []} auctions={auctions ?? []} />
}
```

- [ ] **Step 3: Crea AdminPanel client component**

Crea `app/admin/_components/AdminPanel.tsx`:

```typescript
'use client'
import { useState } from 'react'
import { AdminSidebar } from './AdminSidebar'
import { ImportSection } from './ImportSection'
import { RolesSection } from './RolesSection'
import { ConfigSection } from './ConfigSection'
import { AuctionsSection } from './AuctionsSection'
import { TeamsSection } from './TeamsSection'
import { ExportSection } from './ExportSection'
import type { Config, Team } from '@/lib/supabase/types'

type Section = 'import' | 'roles' | 'config' | 'auctions' | 'teams' | 'export'

type Props = {
  config: Config | null
  teams: Team[]
  auctions: unknown[]
}

export default function AdminPanel({ config, teams, auctions }: Props) {
  const [active, setActive] = useState<Section>('import')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-3">
        <h1 className="font-bold text-lg">Admin — Asta FC Boccea</h1>
      </header>
      <div className="flex gap-6 p-6 max-w-5xl mx-auto">
        <AdminSidebar active={active} onChange={setActive} />
        <main className="flex-1 bg-white rounded-xl shadow p-6">
          {active === 'import' && <ImportSection />}
          {active === 'roles' && config && <RolesSection config={config} />}
          {active === 'config' && config && <ConfigSection config={config} />}
          {active === 'auctions' && <AuctionsSection auctions={auctions as never} />}
          {active === 'teams' && <TeamsSection teams={teams} />}
          {active === 'export' && <ExportSection />}
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Imposta ruolo admin per il tuo account**

Nel Supabase SQL Editor:

```sql
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'
WHERE email = 'tua-email@example.com';
```

- [ ] **Step 5: Commit**

```bash
git add app/admin/
git commit -m "feat: add admin layout with sidebar navigation"
```

---

## Task 19: Admin — ImportSection

**Files:**
- Create: `app/admin/_components/ImportSection.tsx`

- [ ] **Step 1: Crea ImportSection.tsx**

Crea `app/admin/_components/ImportSection.tsx`:

```typescript
'use client'
import { useState, useTransition } from 'react'
import { importPlayers } from '@/lib/players/import-action'

export function ImportSection() {
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<{ imported: number; errors: string[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setError(null)
    setResult(null)

    const reader = new FileReader()
    reader.onload = (ev) => {
      const buffer = ev.target?.result as ArrayBuffer
      startTransition(async () => {
        const r = await importPlayers(new Uint8Array(buffer))
        if ('error' in r) setError(r.error)
        else setResult(r)
      })
    }
    reader.readAsArrayBuffer(file)
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Import Excel calciatori</h2>
      <p className="text-sm text-gray-500 mb-4">
        File Excel da fantacalcio.it. L&apos;import aggiorna i giocatori esistenti (upsert su Id).
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="file"
          accept=".xlsx"
          onChange={e => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm"
        />
        <button
          type="submit"
          disabled={!file || isPending}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
        >
          {isPending ? 'Importazione...' : 'Importa'}
        </button>
      </form>

      {result && (
        <div className="mt-4 p-3 bg-green-50 rounded-lg">
          <p className="text-green-700 font-semibold">✓ {result.imported} giocatori importati</p>
          {result.errors.length > 0 && (
            <ul className="text-xs text-red-500 mt-1">
              {result.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
        </div>
      )}
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Crea server action importPlayers**

Crea `lib/players/import-action.ts`:

```typescript
'use server'
import { createServiceClient } from '@/lib/supabase/server'
import { parsePlayersXlsx } from './import'
import { createClient } from '@/lib/supabase/server'

export async function importPlayers(data: Uint8Array): Promise<
  { imported: number; errors: string[] } | { error: string }
> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'admin') return { error: 'Unauthorized' }

  let players
  try {
    players = parsePlayersXlsx(Buffer.from(data))
  } catch (e) {
    return { error: `Parse error: ${e instanceof Error ? e.message : String(e)}` }
  }

  const service = await createServiceClient()
  const errors: string[] = []
  let imported = 0

  // Upsert in batches of 100
  for (let i = 0; i < players.length; i += 100) {
    const batch = players.slice(i, i + 100)
    const { error } = await service
      .from('players')
      .upsert(batch, { onConflict: 'id' })
    if (error) errors.push(`Batch ${i / 100 + 1}: ${error.message}`)
    else imported += batch.length
  }

  return { imported, errors }
}
```

- [ ] **Step 3: Testa l'import**

Avvia il dev server, vai su /admin → Import, carica `Quotazioni_Fantacalcio_Stagione.xlsx`.

Expected: "X giocatori importati" senza errori.

- [ ] **Step 4: Verifica nel DB**

```sql
SELECT COUNT(*) FROM players;
SELECT * FROM players LIMIT 5;
```

- [ ] **Step 5: Commit**

```bash
git add app/admin/_components/ImportSection.tsx lib/players/import-action.ts
git commit -m "feat: add admin import section with xlsx upsert"
```

---

## Task 20: Admin — RolesSection e ConfigSection

**Files:**
- Create: `app/admin/_components/RolesSection.tsx`
- Create: `app/admin/_components/ConfigSection.tsx`

- [ ] **Step 1: Crea RolesSection.tsx**

Crea `app/admin/_components/RolesSection.tsx`:

```typescript
'use client'
import { useState, useEffect, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updateEnabledRoles } from '@/lib/admin/actions'
import type { Config } from '@/lib/supabase/types'

type Props = { config: Config }

export function RolesSection({ config }: Props) {
  const [availableRoles, setAvailableRoles] = useState<string[]>([])
  const [enabled, setEnabled] = useState<string[]>(config.enabled_roles)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.rpc('get_distinct_roles').then(({ data }) => {
      if (data) setAvailableRoles(data as string[])
    })
  }, [supabase])

  function toggle(role: string) {
    setEnabled(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    )
  }

  function handleSave() {
    startTransition(async () => {
      await updateEnabledRoles(enabled)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Ruoli abilitati al lancio</h2>
      <div className="flex flex-wrap gap-2 mb-4">
        {availableRoles.map(role => (
          <button
            key={role}
            onClick={() => toggle(role)}
            className={`px-3 py-1 rounded-full text-sm border ${
              enabled.includes(role)
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-300'
            }`}
          >
            {role}
          </button>
        ))}
      </div>
      <button
        onClick={handleSave}
        disabled={isPending}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
      >
        {saved ? '✓ Salvato' : isPending ? 'Salvataggio...' : 'Salva'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Aggiungi get_distinct_roles a Supabase**

Nel SQL Editor di Supabase:

```sql
CREATE OR REPLACE FUNCTION get_distinct_roles() RETURNS text[]
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT array_agg(DISTINCT role ORDER BY role)
  FROM (SELECT unnest(roles) AS role FROM players) sub;
$$;
```

- [ ] **Step 3: Crea ConfigSection.tsx**

Crea `app/admin/_components/ConfigSection.tsx`:

```typescript
'use client'
import { useState, useTransition } from 'react'
import { updateConfig } from '@/lib/admin/actions'
import type { Config } from '@/lib/supabase/types'

type Props = { config: Config }

export function ConfigSection({ config: initial }: Props) {
  const [cfg, setCfg] = useState(initial)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  function handleChange(key: keyof Config, value: number) {
    setCfg(prev => ({ ...prev, [key]: value }))
  }

  function handleSave() {
    startTransition(async () => {
      await updateConfig(cfg)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  const fields: { key: keyof Config; label: string }[] = [
    { key: 'auction_duration_hours', label: 'Durata asta (ore)' },
    { key: 'last_minute_threshold_minutes', label: 'Soglia ultimo minuto (min)' },
    { key: 'last_minute_extension_minutes', label: 'Estensione ultimo minuto (min)' },
    { key: 'max_active_auctions_total', label: 'Max aste contemporanee totali' },
    { key: 'max_active_auctions_per_team', label: 'Max aste per squadra' },
  ]

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Configurazione aste</h2>
      <div className="space-y-3 mb-4">
        {fields.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between">
            <label className="text-sm text-gray-700">{label}</label>
            <input
              type="number"
              min={1}
              value={cfg[key] as number}
              onChange={e => handleChange(key, parseInt(e.target.value))}
              className="w-20 border rounded-lg px-2 py-1 text-sm text-right"
            />
          </div>
        ))}
      </div>
      <button
        onClick={handleSave}
        disabled={isPending}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
      >
        {saved ? '✓ Salvato' : isPending ? 'Salvataggio...' : 'Salva configurazione'}
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Crea lib/admin/actions.ts**

Crea `lib/admin/actions.ts`:

```typescript
'use server'
import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import type { Config } from '@/lib/supabase/types'
import { revalidatePath } from 'next/cache'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'admin') throw new Error('Unauthorized')
  return createServiceClient()
}

export async function updateEnabledRoles(roles: string[]) {
  const service = await assertAdmin()
  await service.from('config').update({ enabled_roles: roles }).eq('id', 1)
  revalidatePath('/dashboard')
  revalidatePath('/admin')
}

export async function updateConfig(cfg: Config) {
  const service = await assertAdmin()
  const { enabled_roles: _er, id: _id, ...updates } = cfg
  await service.from('config').update(updates).eq('id', 1)
  revalidatePath('/admin')
}

export async function adminCancelAuction(auctionId: string) {
  const service = await assertAdmin()
  const { error } = await service.rpc('cancel_auction', { p_auction_id: auctionId })
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { success: true }
}

export async function createTeam(teamName: string, ownerName: string, email: string, password: string) {
  const service = await assertAdmin()
  const { data: authData, error: authError } = await service.auth.admin.createUser({
    email,
    password,
    user_metadata: { role: 'user' },
    email_confirm: true,
  })
  if (authError) return { error: authError.message }

  const { error: teamError } = await service.from('teams').insert({
    user_id: authData.user.id,
    team_name: teamName,
    owner_name: ownerName,
  })
  if (teamError) return { error: teamError.message }
  revalidatePath('/admin')
  return { success: true }
}

export async function updateTeamBudget(teamId: string, newBudget: number) {
  const service = await assertAdmin()
  const { error } = await service.from('teams').update({ budget_remaining: newBudget }).eq('id', teamId)
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { success: true }
}

export async function getExportData() {
  const service = await assertAdmin()
  const { data, error } = await service
    .from('players')
    .select('*, teams!players_sold_to_team_id_fkey(team_name)')
    .eq('is_sold', true)
  if (error) return { error: error.message }
  return { data }
}
```

- [ ] **Step 5: Commit**

```bash
git add app/admin/_components/ lib/admin/
git commit -m "feat: add admin roles and config sections"
```

---

## Task 21: Admin — AuctionsSection

**Files:**
- Create: `app/admin/_components/AuctionsSection.tsx`

- [ ] **Step 1: Crea AuctionsSection.tsx**

Crea `app/admin/_components/AuctionsSection.tsx`:

```typescript
'use client'
import { useTransition } from 'react'
import { adminCancelAuction } from '@/lib/admin/actions'

type AuctionRow = {
  id: string
  current_price: number
  expires_at: string
  players: { name: string; roles: string[] }
  teams_winner: { team_name: string } | null
}

type Props = { auctions: AuctionRow[] }

export function AuctionsSection({ auctions }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleCancel(id: string) {
    if (!confirm('Annullare questa asta? Il budget verrà sbloccato.')) return
    startTransition(() => adminCancelAuction(id))
  }

  if (!auctions.length) return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Aste attive</h2>
      <p className="text-gray-400">Nessuna asta attiva.</p>
    </div>
  )

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Aste attive ({auctions.length})</h2>
      <div className="space-y-2">
        {auctions.map(a => (
          <div key={a.id} className="flex items-center justify-between border rounded-lg p-3">
            <div>
              <p className="font-medium">{a.players.name}</p>
              <p className="text-xs text-gray-500">
                {a.players.roles.join('/')} — {a.current_price} cr —{' '}
                {a.teams_winner?.team_name ?? 'Nessun offerente'} —{' '}
                scade {new Date(a.expires_at).toLocaleString('it-IT')}
              </p>
            </div>
            <button
              onClick={() => handleCancel(a.id)}
              disabled={isPending}
              className="text-xs text-red-600 border border-red-300 px-2 py-1 rounded hover:bg-red-50 disabled:opacity-50"
            >
              Annulla
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/admin/_components/AuctionsSection.tsx
git commit -m "feat: add admin auctions section with cancel"
```

---

## Task 22: Admin — TeamsSection

**Files:**
- Create: `app/admin/_components/TeamsSection.tsx`

- [ ] **Step 1: Crea TeamsSection.tsx**

Crea `app/admin/_components/TeamsSection.tsx`:

```typescript
'use client'
import { useState, useTransition } from 'react'
import { createTeam, updateTeamBudget } from '@/lib/admin/actions'
import type { Team } from '@/lib/supabase/types'

type Props = { teams: Team[] }

export function TeamsSection({ teams: initialTeams }: Props) {
  const [teams, setTeams] = useState(initialTeams)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ teamName: '', ownerName: '', email: '', password: '' })
  const [createError, setCreateError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateError(null)
    startTransition(async () => {
      const r = await createTeam(form.teamName, form.ownerName, form.email, form.password)
      if (r.error) setCreateError(r.error)
      else {
        setShowCreate(false)
        setForm({ teamName: '', ownerName: '', email: '', password: '' })
      }
    })
  }

  function handleBudgetChange(teamId: string, budget: number) {
    startTransition(async () => {
      await updateTeamBudget(teamId, budget)
      setTeams(prev => prev.map(t => t.id === teamId ? { ...t, budget_remaining: budget } : t))
    })
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Squadre ({teams.length}/10)</h2>
        {teams.length < 10 && (
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg"
          >
            + Aggiungi
          </button>
        )}
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2">
          <input placeholder="Nome squadra" value={form.teamName}
            onChange={e => setForm(p => ({ ...p, teamName: e.target.value }))}
            className="w-full border rounded px-3 py-1.5 text-sm" required />
          <input placeholder="Nome partecipante" value={form.ownerName}
            onChange={e => setForm(p => ({ ...p, ownerName: e.target.value }))}
            className="w-full border rounded px-3 py-1.5 text-sm" required />
          <input type="email" placeholder="Email accesso" value={form.email}
            onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
            className="w-full border rounded px-3 py-1.5 text-sm" required />
          <input type="password" placeholder="Password accesso" value={form.password}
            onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
            className="w-full border rounded px-3 py-1.5 text-sm" required minLength={6} />
          {createError && <p className="text-red-500 text-xs">{createError}</p>}
          <button type="submit" disabled={isPending}
            className="bg-green-600 text-white px-4 py-1.5 rounded text-sm disabled:opacity-50">
            {isPending ? 'Creazione...' : 'Crea squadra'}
          </button>
        </form>
      )}

      <div className="space-y-2">
        {teams.map(t => (
          <div key={t.id} className="flex items-center justify-between border rounded-lg p-3">
            <div>
              <p className="font-medium">{t.team_name}</p>
              <p className="text-xs text-gray-500">{t.owner_name}</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                defaultValue={t.budget_remaining}
                onBlur={e => {
                  const v = parseInt(e.target.value)
                  if (v !== t.budget_remaining) handleBudgetChange(t.id, v)
                }}
                className="w-20 border rounded px-2 py-1 text-sm text-right"
              />
              <span className="text-xs text-gray-400">cr</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/admin/_components/TeamsSection.tsx
git commit -m "feat: add admin teams section with create and budget edit"
```

---

## Task 23: Admin — ExportSection

**Files:**
- Create: `app/admin/_components/ExportSection.tsx`

- [ ] **Step 1: Crea ExportSection.tsx**

Crea `app/admin/_components/ExportSection.tsx`:

```typescript
'use client'
import { useTransition } from 'react'
import { getExportData } from '@/lib/admin/actions'
import { generateExportCsv } from '@/lib/export/csv'
import type { SoldPlayerExport } from '@/lib/export/csv'

export function ExportSection() {
  const [isPending, startTransition] = useTransition()

  function handleExport() {
    startTransition(async () => {
      const result = await getExportData()
      if ('error' in result) { alert(result.error); return }

      const exportData: SoldPlayerExport[] = (result.data ?? []).map((p: {
        id: number
        name: string
        serie_a_team: string | null
        classic_role: string | null
        roles: string[]
        sold_price: number
        teams: { team_name: string } | null
      }) => ({
        id: p.id,
        name: p.name,
        serie_a_team: p.serie_a_team,
        classic_role: p.classic_role,
        roles: p.roles,
        sold_price: p.sold_price,
        team_name: p.teams?.team_name ?? '',
      }))

      const csv = generateExportCsv(exportData)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `asta-fc-boccea-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    })
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Export fantacalcio.it</h2>
      <p className="text-sm text-gray-500 mb-4">
        Scarica il CSV con tutti i giocatori venduti, pronto per l&apos;import su fantacalcio.it.
      </p>
      <button
        onClick={handleExport}
        disabled={isPending}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
      >
        {isPending ? 'Generazione...' : '📥 Scarica CSV'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Esegui tutti i test finali**

```bash
npm test
```

Expected: PASS — import, validation, csv.

- [ ] **Step 3: Verifica TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/admin/_components/ExportSection.tsx
git commit -m "feat: add admin export section for fantacalcio.it CSV"
```

---

## Task 24: Deploy su Vercel + GitHub

**Files:**
- No new files

- [ ] **Step 1: Crea repository GitHub**

Vai su github.com → New repository → nome `bocceasta` (private).

- [ ] **Step 2: Push del codice**

```bash
git remote add origin https://github.com/<tuo-utente>/bocceasta.git
git push -u origin master
```

- [ ] **Step 3: Configura Vercel**

Vai su vercel.com → New Project → Import from GitHub → seleziona `bocceasta`.

Framework preset: Next.js (auto-detected).

- [ ] **Step 4: Aggiungi env vars in Vercel**

Settings → Environment Variables — aggiungi:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

- [ ] **Step 5: Deploy**

Click "Deploy". Vercel buildirà automaticamente.

Expected: deploy success, URL tipo `bocceasta.vercel.app`.

- [ ] **Step 6: Aggiungi dominio Vercel a Supabase**

Supabase Dashboard → Authentication → URL Configuration → aggiungi il dominio Vercel in `Site URL` e `Redirect URLs`.

- [ ] **Step 7: Smoke test produzione**

1. Apri `bocceasta.vercel.app` → redirect a /login ✓
2. Login con account admin ✓
3. Admin → Import → carica Excel ✓
4. Admin → Ruoli → abilita `Por` ✓
5. Dashboard → Lancia asta su un portiere ✓
6. Da altro account → Rilancia ✓
7. Admin → Export → scarica CSV ✓

- [ ] **Step 8: Commit finale**

```bash
git add .
git commit -m "chore: finalize deploy configuration"
git push
```

---

## Checklist coverage spec

| Requisito spec | Task |
|---|---|
| Import Excel xlsx, upsert su id, colonne A/C/D/E/L | Task 8, 19 |
| Ruoli Mantra multipli da colonna C, split `;` | Task 8 |
| Auth email+password 10 utenti | Task 7 |
| Admin ruolo via user_metadata | Task 18 |
| Timer 24h + estensione +2min ultimo minuto | Task 5 |
| Budget 500cr, lock/unlock atomico | Task 5 |
| Validazioni lancio: ruolo, sold, limiti, budget | Task 9 |
| Validazioni bid: > current, budget, winner, scaduta | Task 9 |
| Aste attive max 10 totali, max 2 per team | Task 5, 9 |
| Realtime aggiornamento timer e importo | Task 15 |
| Chiusura automatica aste scadute | Task 12 |
| Admin annulla asta + sblocco budget | Task 20, 21 |
| Admin crea squadre | Task 22 |
| Admin modifica budget manualmente | Task 22 |
| Export CSV formato fantacalcio.it | Task 11, 23 |
| Ricerca giocatori filtrata per ruoli abilitati | Task 16 |
| Dashboard: budget header, contatore rosa | Task 13 |
| Rosa tab per ruolo Mantra | Task 17 |
| Logo FC Boccea | Task 7 |
| Deploy Vercel + GitHub CI | Task 24 |
