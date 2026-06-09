# Fantacalcio Boccea — Asta Online 2026/27

Webapp per l'asta del fantacalcio della lega FC Boccea, modalità **Mantra**, stile eBay.

## Stack

- **Frontend:** Next.js 15, TypeScript, Tailwind CSS
- **Backend/DB:** Supabase (PostgreSQL + Auth + Realtime + Edge Functions)
- **Deploy:** Vercel (CI/CD via GitHub)

## Funzionalità

### Partecipanti
- Login email/password
- Lista calciatori con stato (libero / in asta / acquistato) e filtri per ruolo e stato
- Lancio asta direttamente dalla lista calciatori (ruoli abilitati dall'admin)
- Aste attive in tempo reale con timer live (countdown 24h, +2min se rilancio nell'ultimo minuto)
- Rilancio con validazione budget
- **Autobid**: imposta un massimo — il sistema rilancia automaticamente +1 per te fino al tuo max
- Rosa personale con vista per ruolo Mantra e totale speso

### Admin
- Import calciatori da Excel fantacalcio.it (upsert su Id, colonne A/C/D/E/L)
- Abilita/disabilita ruoli Mantra per il lancio aste
- Configura parametri asta (durata, estensione last-minute, limiti contemporanei)
- Gestione 10 squadre: crea account, modifica budget
- Annulla aste con rimborso automatico budget
- Export CSV formato fantacalcio.it con tutti i calciatori acquistati

## Setup locale

```bash
git clone https://github.com/leonepigro/bocceasta
cd bocceasta
npm install

cp .env.local.example .env.local
# Inserisci le credenziali Supabase in .env.local

npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push

npm run dev
```

## Variabili d'ambiente

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## Primo avvio

1. Crea account admin su Supabase → Authentication → Users → Add user
2. Imposta ruolo admin nel SQL Editor:
   ```sql
   UPDATE auth.users
   SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'
   WHERE email = 'tua-email@example.com';
   ```
3. `/admin` → Import Excel → carica file da fantacalcio.it
4. Admin → Squadre → crea i 10 account partecipanti
5. Admin → Ruoli abilitati → seleziona ruoli e avvia l'asta

## Regole asta

| Parametro | Default |
|---|---|
| Budget per squadra | 500 crediti |
| Portieri | min 2, max 2 |
| Giocatori di movimento | min 25, max 28 |
| Durata asta | 24 ore |
| Estensione last-minute | +2 min se rilancio nell'ultimo minuto |
| Max aste contemporanee | 10 totali, 2 per squadra |

**Autobid:** il sistema rilancia automaticamente +1 per te fino al tuo massimo. Se qualcuno supera il max sei battuto.

## Modalità Mantra

Ruoli caricati dinamicamente dall'Excel (colonna RM): `Por`, `Dc`, `Dd`, `Ds`, `E`, `M`, `C`, `W`, `T`, `A`, `Pc` e combinazioni (es. `Dd;Dc`).
