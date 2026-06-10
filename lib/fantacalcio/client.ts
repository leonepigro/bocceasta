const APP_BASE = 'https://appleghe.fantacalcio.it/api'

const APP_KEY = process.env.FANTACALCIO_APP_KEY!

function headers(extra: Record<string, string> = {}) {
  return {
    'Content-Type': 'application/json',
    app_key: APP_KEY,
    ...extra,
  }
}

export type FcLeague = {
  id: number
  nome: string
  alias: string
  token: string
  tipo: string // 'CLASSIC' | 'MANTRA'
}

export type FcTeam = {
  id: number
  nome: string
  presidente: { id: number; username: string; email: string }
  calciatori: { id: number; prezzo: number }[]
}

export type FcParticipant = {
  id: number
  username: string
  email: string
  ruolo: string
}

// Login → restituisce user_token
export async function login(): Promise<string> {
  const username = process.env.FANTACALCIO_USERNAME
  const password = process.env.FANTACALCIO_PASSWORD
  if (!username || !password) throw new Error('Credenziali fantacalcio.it non configurate')
  if (!APP_KEY) throw new Error('FANTACALCIO_APP_KEY non configurata')

  const res = await fetch(`${APP_BASE}/v1/v1_utente/login`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ username, password }),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`Login fallito: ${res.status} — ${text}`)
  let data: Record<string, unknown>
  try { data = JSON.parse(text) } catch { throw new Error(`Login: risposta non JSON — ${text.slice(0, 200)}`) }

  // Struttura attesa: { utente: { utente_token } } oppure { data: { utente_token } } o simile
  const token =
    (data?.utente as Record<string, unknown>)?.utente_token ??
    (data?.data as Record<string, unknown>)?.utente_token ??
    data?.utente_token ??
    data?.token

  if (!token) throw new Error(`Login: token non trovato nella risposta — ${JSON.stringify(data).slice(0, 300)}`)
  return token as string
}

// Recupera la lega con alias_lega = fantacalcio-boccea
export async function getLeague(userToken: string): Promise<{ league: FcLeague; teams: FcTeam[]; participants: FcParticipant[] }> {
  const alias = process.env.FANTACALCIO_ALIAS ?? 'fantacalcio-boccea'

  // Profilo utente → lista leghe
  const profileRes = await fetch(
    `${APP_BASE}/v1/v1_utente/profilo?app_key=${APP_KEY}&user_token=${userToken}`
  )
  if (!profileRes.ok) throw new Error('Recupero profilo fallito')
  const profile = await profileRes.json()

  const league: FcLeague = profile.leghe?.find((l: FcLeague) => l.alias === alias)
  if (!league) throw new Error(`Lega "${alias}" non trovata nel profilo`)

  // Squadre con rose
  const teamsRes = await fetch(
    `${APP_BASE}/v1/v1_lega/squadre?app_key=${APP_KEY}&user_token=${userToken}&lega_token=${league.token}`
  )
  if (!teamsRes.ok) throw new Error('Recupero squadre fallito')
  const teams: FcTeam[] = await teamsRes.json()

  // Partecipanti
  const partRes = await fetch(
    `${APP_BASE}/v1/V2_Lega/invitiAccettati?app_key=${APP_KEY}&user_token=${userToken}&lega_token=${league.token}`
  )
  const participants: FcParticipant[] = partRes.ok ? await partRes.json() : []

  return { league, teams, participants }
}

// Assegna un giocatore a una squadra (dopo asta)
export async function buyPlayer(
  userToken: string,
  leagueAlias: string,
  leagueToken: string,
  teamId: number,
  playerId: number,
  price: number
): Promise<void> {
  const res = await fetch(
    `${APP_BASE}/servizi/v1_leghemercatoOrdinarioAdmin/salva?alias_lega=${leagueAlias}`,
    {
      method: 'PUT',
      headers: headers({ user_token: userToken, lega_token: leagueToken }),
      body: JSON.stringify({ id_squadra: teamId, ids: [playerId], costi: [price] }),
    }
  )
  const data = await res.json()
  if (!data.success) throw new Error(data.error_msgs?.join(', ') ?? 'Errore buyPlayer')
}

// Svincola un giocatore
export async function releasePlayer(
  userToken: string,
  leagueAlias: string,
  leagueToken: string,
  teamId: number,
  playerId: number,
  price: number
): Promise<void> {
  const res = await fetch(
    `${APP_BASE}/servizi/v1_leghemercatoOrdinarioAdmin/svincola?alias_lega=${leagueAlias}`,
    {
      method: 'DELETE',
      headers: headers({ user_token: userToken, lega_token: leagueToken }),
      body: JSON.stringify({ id_squadra: teamId, ids: [playerId], costi: [price] }),
    }
  )
  const data = await res.json()
  if (!data.success) throw new Error(data.error_msgs?.join(', ') ?? 'Errore releasePlayer')
}
