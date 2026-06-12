# 🚀 Deploy per una nuova lega — Guida 30 minuti

Setup di un'istanza isolata di Bocceasta per una nuova lega.

**Costo:** zero. Free tier di Supabase + Vercel coprono ampiamente 10 utenti × 1 lega.

**Cosa ottieni:** url tipo `nome-lega.vercel.app` solo per la tua lega, dati separati, admin tuo.

---

## Pre-requisiti

- Account GitHub
- Account [Supabase](https://supabase.com) (free tier, no carta richiesta)
- Account [Vercel](https://vercel.com) (free tier, no carta)
- Browser + 30 minuti

---

## 📋 Step-by-step

### 1. Fork del repo (1 min)

1. Vai su [github.com/leonepigro/bocceasta](https://github.com/leonepigro/bocceasta)
2. Click **Fork** (in alto a destra)
3. Rinomina il fork con il nome della tua lega: `bocceasta-cosenza`, `fanta-amici-roma`, ecc.

### 2. Crea progetto Supabase (5 min)

1. [supabase.com](https://supabase.com) → **New project**
2. Nome: `bocceasta-<nomelega>`
3. Password DB: generane una forte (salvala da parte)
4. Region: `Europe West (Frankfurt)` o quella più vicina ai partecipanti
5. Plan: **Free**
6. Click **Create** → aspetta ~2 minuti

### 3. Esegui le migration (5 min)

1. Dal pannello Supabase → menu sinistro → **SQL Editor**
2. Click **+ New query**
3. Apri nel tuo fork la cartella `supabase/migrations/` — file numerati `001_*.sql` → `015_*.sql`
4. **Per ogni file**, copia il contenuto, incollalo nell'SQL Editor, click **Run**
5. L'ordine numerico è importante: parti dal 001, finisci col 015

Se vuoi velocizzare: incolla tutti i file in un unico query separati da `;` e fai un **Run** solo.

### 4. Crea l'utente admin (2 min)

1. Supabase → **Authentication** → **Users** → **Add user** → **Create new user**
2. Inserisci la tua email + password ≥ 6 caratteri
3. Spunta **Auto Confirm User**
4. **Create user**
5. Torna su **SQL Editor** → esegui (sostituisci l'email):
   ```sql
   UPDATE auth.users
   SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'
   WHERE email = 'tua-email@example.com';
   ```

### 5. Recupera le credenziali Supabase (2 min)

Supabase → **Project Settings** (ingranaggio) → **API**:
- Copia **Project URL** → `https://xxxx.supabase.co`
- Copia **anon public** key
- Copia **service_role** key (è segreta, non condividere)

### 6. Deploy su Vercel (10 min)

1. [vercel.com](https://vercel.com) → **Add New** → **Project**
2. **Import Git Repository** → autorizza GitHub se richiesto
3. Seleziona il tuo fork
4. **Configure Project**:
   - **Framework**: Next.js (auto-detect)
   - **Environment Variables** → aggiungi:
     | Name | Value |
     |---|---|
     | `NEXT_PUBLIC_SUPABASE_URL` | il Project URL dal punto 5 |
     | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | la anon key |
     | `SUPABASE_SERVICE_ROLE_KEY` | la service_role key |
5. **Deploy** → aspetta ~2 minuti
6. Vercel ti dà un url tipo `<nomeprogetto>.vercel.app`

### 7. Primo login (5 min)

1. Apri l'url del tuo deploy
2. **Accedi** con email + password admin
3. Vai su `/admin` → **Import Excel**
4. Carica il file più recente dei calciatori da [fantacalcio.it](https://leghe.fantacalcio.it/leghe-tutti-i-calciatori/) (formato Excel con colonna RM)

### 8. Onboarding partecipanti (continuo)

1. Manda link `<tuo-url>/register` agli amici
2. Si registrano da soli (email + password)
3. Tu: Admin → **Squadre** → **+ Aggiungi** → tab **"Lega utente registrato"**
4. Seleziona dalla dropdown → assegna nome squadra + owner → crea
5. Ripeti per i 10 partecipanti

---

## ⚙️ Configurazione consigliata

Admin → **⭐ Wishlist config**:
- Wishlist abilitata: ✓
- Max giocatori: 30
- Max per ruolo: Por=1, Dc=4, B=2, Dd=2, Ds=2, E=2, M=3, C=3, T=2, W=3, A=3, Pc=3
- Cap Quotazione: 0 (usa media auto) oppure 1100 (lascia 95 FVM margine per slot economici)

---

## 🔄 Aggiornamenti

Quando il repo originale `leonepigro/bocceasta` ha nuove feature:

1. Sul tuo fork GitHub → **Sync fork** (bottone in alto)
2. Vercel ridistribuisce automaticamente al prossimo push
3. Se ci sono nuove migration (`016_*.sql`, ecc.), eseguile via SQL Editor

---

## 🆘 Troubleshooting

**"Errore relation X non esiste"** → manca una migration. Controlla che siano state eseguite tutte in ordine.

**"Email già registrata"** → l'utente si era registrato. Da `Authentication → Users` puoi resettare o cancellare.

**Sorteggio dà errore** → controlla che ci siano almeno 10 squadre create + import giocatori completato.

**Build Vercel fallisce** → controlla env vars. Tutti e 3 i valori devono essere settati per Production AND Preview.

---

## 📊 Limiti free tier (sufficiente per 1-2 leghe)

| Risorsa | Free tier | Uso stimato per lega |
|---|---|---|
| Supabase Database | 500 MB | ~5 MB |
| Supabase MAU | 50.000 | ~10 utenti |
| Vercel Bandwidth | 100 GB/mese | ~1 GB |
| Vercel Build time | 6.000 min/mese | ~20 min |

Una singola lega usa <1% delle risorse free. Margine enorme.

---

## 🤝 Contribuire

Trovi bug o vuoi proporre feature? Apri una issue/PR sul [repo upstream](https://github.com/leonepigro/bocceasta).
