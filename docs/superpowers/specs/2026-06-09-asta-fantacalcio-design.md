# Asta Fantacalcio Online — Design Spec
**Data:** 2026-06-09  
**Progetto:** bocceasta  
**Lega:** FC Boccea — modalità Mantra

---

## Contesto

10 partecipanti, impossibilitati a incontrarsi fisicamente. Serve una webapp che gestisca l'asta fantacalcio in modalità self-service filtrata per ruolo, stile eBay, con timer live, controllo budget e export compatibile fantacalcio.it.

---

## Stack

| Layer | Tecnologia |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend / DB | Supabase (PostgreSQL + Auth + Realtime + Edge Functions) |
| Deploy frontend | Vercel (deploy automatico da push su `main`) |
| Deploy backend | Supabase Cloud (free tier) |
| CI/CD | GitHub → Vercel integration |

---

## Architettura

```
/app
  /login              → autenticazione email+password
  /dashboard          → aste attive, lancia asta, budget, rosa
  /admin              → pannello admin (import, config, aste, export)
```

- **Real-time:** Supabase Realtime subscriptions su tabella `bids` — aggiornamento timer e importo su tutti i client connessi senza polling
- **Auth:** Supabase Auth email+password; admin identificato da `user_metadata.role = 'admin'`
- **Chiusura aste:** Supabase Edge Function con cron ogni minuto — chiude aste con `expires_at < now()` e `status = 'active'`

---

## Modello Dati

```sql
-- Squadre
teams (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users,
  team_name       text NOT NULL,
  owner_name      text NOT NULL,
  budget_remaining integer NOT NULL DEFAULT 500,
  created_at      timestamptz DEFAULT now()
)

-- Calciatori (importati da Excel fantacalcio.it)
players (
  id              integer PRIMARY KEY,  -- Id colonna A Excel
  name            text NOT NULL,        -- colonna D
  serie_a_team    text,                 -- colonna E
  roles           text[] NOT NULL,      -- colonna C split per ';' → ['Dd','Dc']
  classic_role    text,                 -- colonna B — solo retrocompatibilità, non esposto in UI
  fvm             integer,              -- colonna L
  is_sold         boolean DEFAULT false,
  sold_to_team_id uuid REFERENCES teams(id),
  sold_price      integer,
  created_at      timestamptz DEFAULT now()
)

-- Aste
auctions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id             integer REFERENCES players(id),
  started_by_team_id    uuid REFERENCES teams(id),
  status                text NOT NULL DEFAULT 'active', -- active | sold | cancelled
  current_price         integer NOT NULL,
  current_winner_team_id uuid REFERENCES teams(id),
  expires_at            timestamptz NOT NULL,
  created_at            timestamptz DEFAULT now()
)

-- Offerte
bids (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id  uuid REFERENCES auctions(id),
  team_id     uuid REFERENCES teams(id),
  amount      integer NOT NULL,
  placed_at   timestamptz DEFAULT now()
)

-- Configurazione (singola riga, id = 1)
config (
  id                              integer PRIMARY KEY DEFAULT 1,
  enabled_roles                   text[] DEFAULT '{}',  -- ruoli abilitati al lancio
  max_active_auctions_total       integer DEFAULT 10,
  max_active_auctions_per_team    integer DEFAULT 2,
  auction_duration_hours          integer DEFAULT 24,
  last_minute_extension_minutes   integer DEFAULT 2,
  last_minute_threshold_minutes   integer DEFAULT 1
)

-- Requisiti rosa (configurabili)
roster_requirements (
  id        integer PRIMARY KEY,
  role      text,       -- ruolo Mantra o 'movement' per giocatori di movimento
  min_count integer,
  max_count integer
  -- default: Por→min 2 max 2, movement→min 25 max 28
)
```

**Budget lock:** quando un team fa un'offerta, il delta rispetto alla precedente viene bloccato. Se superato, il budget torna disponibile immediatamente via trigger Supabase.

---

## Flusso Asta

### Lancio
1. Partecipante cerca giocatore — lista filtrata: `player.roles && config.enabled_roles` (operatore overlap PostgreSQL)
2. Inserisce offerta iniziale (minimo 1 credito)
3. Validazioni server-side:
   - Ruolo abilitato ✓
   - Giocatore non venduto ✓
   - Aste attive del team < `max_active_auctions_per_team` ✓
   - Aste totali attive < `max_active_auctions_total` ✓
   - `budget_remaining >= offerta` ✓
4. Asta creata con `expires_at = now() + auction_duration_hours`

### Offerta
1. Offerta deve essere > `current_price` e ≤ `budget_remaining`
2. Budget nuovo offerente bloccato; budget precedente sbloccato
3. Se `placed_at > expires_at - last_minute_threshold_minutes` → `expires_at += last_minute_extension_minutes`
4. Supabase Realtime notifica tutti i client connessi → timer e importo aggiornati live

### Chiusura
- Client calcola countdown da `expires_at` (niente job server per display)
- Edge Function cron ogni minuto: chiude aste scadute → `status = 'sold'`, aggiorna `players.is_sold`, scala budget definitivo al vincitore
- Admin può annullare manualmente: `status = 'cancelled'`, tutti i budget sbloccati

---

## Pannello Admin (`/admin`)

Accesso riservato a utenti con `user_metadata.role = 'admin'`. Sidebar con sezioni:

| Sezione | Funzionalità |
|---|---|
| Import | Upload `.xlsx`, parse col A/C/D/E/L, upsert su `id` |
| Ruoli | Multiselect ruoli distinti presenti in DB → salva in `config.enabled_roles` |
| Configurazione | Timer, estensione, limiti aste |
| Aste attive | Lista con annulla per singola asta |
| Team | Crea/modifica 10 account squadra, aggiusta budget manuale se necessario |
| Export | Download CSV formato fantacalcio.it |

---

## Export fantacalcio.it

CSV semicolon-separated, solo giocatori `is_sold = true`:

```
Id;Nome;Squadra;Ruolo;Ruolo Mantra;Qt.A;Fantateam
4431;Carnesecchi;Atalanta;P;Por;18;FC Boccea
```

Colonne: `Id`, `Nome`, `Squadra`, `Ruolo` (classic_role), `Ruolo Mantra` (roles joined con `;`), `Qt.A` (sold_price), `Fantateam` (team_name acquirente).

---

## UI / Pagine

### `/login`
Logo FC Boccea, form email+password.

### `/dashboard`
- **Header:** nome squadra, budget residuo, contatore rosa (es. "12 / 25-28 giocatori")
- **Aste attive:** card con timer live, offerente corrente, importo, form rilancio inline
- **Lancia asta:** search giocatori filtrati per ruoli abilitati, offerta iniziale
- **Tab "La mia rosa":** giocatori acquistati raggruppati per ruolo Mantra

### `/admin`
Sidebar navigation, tutto su una pagina, niente routing annidato.

**Tema:** colori estratti dal logo FC Boccea, mobile-first (asta seguita da telefono).

---

## Parametri di default

| Parametro | Valore |
|---|---|
| Budget per squadra | 500 crediti |
| Partecipanti | 10 |
| Portieri per squadra | min 2, max 2 |
| Giocatori di movimento | min 25, max 28 |
| Durata asta | 24 ore |
| Estensione ultimo minuto | +2 minuti |
| Soglia ultimo minuto | 1 minuto |
| Max aste totali contemporanee | 10 |
| Max aste per team | 2 |
