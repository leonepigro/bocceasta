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

const GK_PER_TEAM = 2
const OUTFIELD_ROLES = ['Dc', 'B', 'Dd', 'Ds', 'E', 'M', 'C', 'T', 'W', 'A', 'Pc']

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function sumFvm(players: DraftPlayer[]): number {
  return players.reduce((s, p) => s + (p.fvm ?? 0), 0)
}

// Distribuisce i giocatori in batch da n, ordinati per FVM.
// Dentro ogni batch: estrazione casuale (shuffle) — ogni team prende un giocatore a caso
// dal gruppo, garantendo che tutti i gruppi vengano distribuiti equamente tra i partecipanti.
function balancedDistribute(
  pool: DraftPlayer[],
  assignments: DraftTeamAssignment[]
): void {
  const n = assignments.length
  const sorted = [...pool].sort((a, b) => (b.fvm ?? 0) - (a.fvm ?? 0))

  for (let i = 0; i < sorted.length; i += n) {
    const batch = sorted.slice(i, i + n)
    // Shuffle casuale: ogni team pesca un giocatore a caso dal gruppo
    const shuffledBatch = shuffle(batch)
    // Per il primo batch di ogni ruolo, ordine team completamente casuale.
    // Per i batch successivi, i team con FVM più basso hanno priorità (piccola correzione).
    const order = i === 0
      ? shuffle([...Array(n).keys()])
      : [...Array(n).keys()].sort((a, b) => sumFvm(assignments[a].players) - sumFvm(assignments[b].players))

    shuffledBatch.forEach((player, j) => {
      if (j < order.length) assignments[order[j]].players.push(player)
    })
  }
}

export function generateDraft(
  bocceastaTeams: Team[],
  rawPlayers: { id: number; name: string; roles: string[]; fvm: number | null; serie_a_team: string | null }[]
): DraftResult {
  const n = bocceastaTeams.length
  // Shuffle team order solo per i portieri (assegnazione squadre Serie A)
  const teams = shuffle([...bocceastaTeams])
  const assignments: DraftTeamAssignment[] = teams.map(t => ({
    team: t, players: [], gk_serie_a_teams: [],
  }))

  const players: DraftPlayer[] = rawPlayers
    .filter(p => p.roles.length > 0)
    .map(p => ({ ...p, primary_role: p.roles[0] }))

  const assignedIds = new Set<number>()

  // ─── PORTIERI: top 2 FVM dalle 2 squadre Serie A sorteggiate ───
  const porPlayers = players
    .filter(p => p.primary_role === 'Por')
    .sort((a, b) => (b.fvm ?? 0) - (a.fvm ?? 0))

  const serieATeams = shuffle(
    [...new Set(porPlayers.map(p => p.serie_a_team).filter(Boolean) as string[])]
  )

  for (let i = 0; i < n; i++) {
    const assigned = [serieATeams[i * 2], serieATeams[i * 2 + 1]].filter(Boolean)
    assignments[i].gk_serie_a_teams = assigned
    const gks = porPlayers
      .filter(p => assigned.includes(p.serie_a_team ?? ''))
    for (const gk of gks) { assignments[i].players.push(gk); assignedIds.add(gk.id) }
  }

  // ─── OUTFIELD: per ogni ruolo, batch bilanciati per FVM ────────
  for (const role of OUTFIELD_ROLES) {
    const pool = players
      .filter(p => p.primary_role === role && !assignedIds.has(p.id))
    balancedDistribute(pool, assignments)
    pool.forEach(p => assignedIds.add(p.id))
  }

  return { assignments }
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
