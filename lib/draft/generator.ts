// Algoritmo sorteggio v2 (portieri raggruppati per squadra Serie A)
import type { Team } from '@/lib/supabase/types'

export type DraftPlayer = {
  id: number
  name: string
  roles: string[]
  fvm: number | null
  serie_a_team: string | null
  primary_role: string
}

export type DraftTeamAssignment = {
  team: Team
  players: DraftPlayer[]
  gk_serie_a_teams: string[]
}

export type DraftResult = {
  assignments: DraftTeamAssignment[]
}

// Ruoli outfield (portieri trattati separatamente per squadra Serie A)
const OUTFIELD_ROLES = ['Pc', 'A', 'T', 'W', 'M', 'C', 'E', 'Dc', 'B', 'Dd', 'Ds']
const GK_SERIE_A_TEAMS_PER_PARTICIPANT = 2

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Distribuzione globale per Quotazione: tutti i giocatori (portieri inclusi)
// ordinati per FVM desc, ogni giocatore va al team con totale FVM più basso
// e che ha ancora slot per quel ruolo. Garantisce equità totale.
function globalBalancedDistribute(
  allPlayers: DraftPlayer[],
  assignments: DraftTeamAssignment[]
): void {
  const n = assignments.length

  const roleCounts: Record<string, number> = {}
  for (const p of allPlayers) roleCounts[p.primary_role] = (roleCounts[p.primary_role] ?? 0) + 1
  const roleTarget: Record<string, number> = {}
  for (const [role, cnt] of Object.entries(roleCounts)) roleTarget[role] = Math.floor(cnt / n)

  const remaining: Record<string, number>[] = Array.from({ length: n }, () =>
    Object.fromEntries(Object.entries(roleTarget).map(([r, t]) => [r, t]))
  )

  // Inizializza con FVM già presenti (es. portieri assegnati prima)
  const totalFvm: number[] = assignments.map(a =>
    a.players.reduce((s, p) => s + (p.fvm ?? 0), 0)
  )

  const sorted = [...allPlayers].sort((a, b) => (b.fvm ?? 0) - (a.fvm ?? 0))

  for (const player of sorted) {
    const role = player.primary_role

    const eligible = [...Array(n).keys()].filter(i => (remaining[i][role] ?? 0) > 0)
    if (eligible.length === 0) continue

    eligible.sort((a, b) => {
      const diff = totalFvm[a] - totalFvm[b]
      return diff + (Math.random() - 0.5) * 5
    })

    const pick = eligible[0]
    assignments[pick].players.push(player)
    totalFvm[pick] += player.fvm ?? 0
    remaining[pick][role]--
  }
}

function generateSingleDraft(
  bocceastaTeams: Team[],
  rawPlayers: { id: number; name: string; roles: string[]; fvm: number | null; serie_a_team: string | null }[]
): DraftResult {
  const n = bocceastaTeams.length
  const teams = shuffle([...bocceastaTeams])
  const assignments: DraftTeamAssignment[] = teams.map(t => ({
    team: t, players: [], gk_serie_a_teams: [],
  }))

  const players: DraftPlayer[] = rawPlayers
    .filter(p => p.roles.length > 0)
    .map(p => ({ ...p, primary_role: p.roles[0] }))

  // ─── PORTIERI per squadra Serie A, bilanciati per quotazione del top GK ───
  const porPlayers = players.filter(p => p.primary_role === 'Por')

  // Raggruppa portieri per squadra Serie A
  const gkByTeam = new Map<string, DraftPlayer[]>()
  for (const gk of porPlayers) {
    if (!gk.serie_a_team) continue
    const list = gkByTeam.get(gk.serie_a_team) ?? []
    list.push(gk)
    gkByTeam.set(gk.serie_a_team, list)
  }

  // Per ogni squadra Serie A: quotazione = max FVM tra i suoi portieri
  type GkTeamSlot = { serieATeam: string; topFvm: number; players: DraftPlayer[] }
  const gkSlots: GkTeamSlot[] = [...gkByTeam.entries()].map(([serieATeam, gks]) => ({
    serieATeam,
    topFvm: Math.max(...gks.map(g => g.fvm ?? 0)),
    players: gks,
  }))

  // Ordina per topFvm desc, poi assegna al partecipante con quotazione totale più bassa
  // che ha ancora slot Serie A disponibili (max GK_SERIE_A_TEAMS_PER_PARTICIPANT a testa)
  const gkSlotsSorted = [...gkSlots].sort((a, b) => b.topFvm - a.topFvm)
  const totalFvm: number[] = new Array(n).fill(0)
  const serieATeamsCount: number[] = new Array(n).fill(0)

  for (const slot of gkSlotsSorted) {
    const eligible = [...Array(n).keys()].filter(
      i => serieATeamsCount[i] < GK_SERIE_A_TEAMS_PER_PARTICIPANT
    )
    if (eligible.length === 0) break

    eligible.sort((a, b) => {
      const diff = totalFvm[a] - totalFvm[b]
      return diff + (Math.random() - 0.5) * 5
    })

    const pick = eligible[0]
    assignments[pick].gk_serie_a_teams.push(slot.serieATeam)
    for (const gk of slot.players) {
      assignments[pick].players.push(gk)
      totalFvm[pick] += gk.fvm ?? 0
    }
    serieATeamsCount[pick]++
  }

  // ─── OUTFIELD distribuiti per Quotazione (parte dal totale già caricato coi portieri) ───
  const allOutfield = players.filter(p => OUTFIELD_ROLES.includes(p.primary_role))
  globalBalancedDistribute(allOutfield, assignments)

  return { assignments }
}

// FVM totale rosa (portieri inclusi)
function totalRosterFvm(a: DraftTeamAssignment): number {
  return a.players.reduce((s, p) => s + (p.fvm ?? 0), 0)
}

// Best-of-N: genera 100 sorteggi candidati, ritorna quello con minor range FVM totale.
// Bilancia il totale (compresi i portieri assegnati casualmente).
export function generateDraft(
  bocceastaTeams: Team[],
  rawPlayers: Parameters<typeof generateSingleDraft>[1]
): DraftResult {
  const N_CANDIDATES = 100
  let best: DraftResult | null = null
  let bestSpread = Infinity

  for (let i = 0; i < N_CANDIDATES; i++) {
    const candidate = generateSingleDraft(bocceastaTeams, rawPlayers)
    const fvms = candidate.assignments.map(totalRosterFvm)
    const spread = Math.max(...fvms) - Math.min(...fvms)
    if (spread < bestSpread) {
      bestSpread = spread
      best = candidate
    }
  }

  return best!
}


export function draftStats(assignment: DraftTeamAssignment) {
  const byRole: Record<string, number> = {}
  for (const p of assignment.players) {
    byRole[p.primary_role] = (byRole[p.primary_role] ?? 0) + 1
  }
  const fvmTotal = assignment.players.reduce((s, p) => s + (p.fvm ?? 0), 0)
  const outfieldCount = assignment.players.filter(p => p.primary_role !== 'Por').length
  return { byRole, fvmTotal, total: assignment.players.length, outfieldCount }
}
