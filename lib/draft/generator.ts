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
  unassigned: DraftPlayer[]  // portieri senza squadra Serie A abbinata (se <20 team)
}

// Ruoli outfield in ordine di distribuzione
const OUTFIELD_ROLES = ['Dc', 'B', 'Dd', 'Ds', 'E', 'M', 'C', 'T', 'W', 'A', 'Pc']

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function distributeBatches(
  players: DraftPlayer[],
  assignments: DraftTeamAssignment[]
): void {
  const n = assignments.length
  const sorted = [...players].sort((a, b) => (b.fvm ?? 0) - (a.fvm ?? 0))

  for (let i = 0; i < sorted.length; i += n) {
    const batch = sorted.slice(i, i + n)
    const shuffledBatch = shuffle(batch)
    const shuffledTeams = shuffle([...Array(n).keys()])
    shuffledBatch.forEach((player, j) => {
      assignments[shuffledTeams[j]].players.push(player)
    })
  }
}

export function generateDraft(
  bocceastaTeams: Team[],
  rawPlayers: { id: number; name: string; roles: string[]; fvm: number | null; serie_a_team: string | null }[]
): DraftResult {
  const n = bocceastaTeams.length
  const teams = shuffle([...bocceastaTeams])
  const assignments: DraftTeamAssignment[] = teams.map(t => ({
    team: t,
    players: [],
    gk_serie_a_teams: [],
  }))

  // Converti in DraftPlayer usando il primo ruolo come primario
  const players: DraftPlayer[] = rawPlayers
    .filter(p => p.roles.length > 0)
    .map(p => ({ ...p, primary_role: p.roles[0] }))

  // ─── PORTIERI ───────────────────────────────────────────────
  const porPlayers = players.filter(p => p.primary_role === 'Por')
  const serieATeams = shuffle(
    [...new Set(porPlayers.map(p => p.serie_a_team).filter(Boolean) as string[])]
  )
  // 2 squadre Serie A per partecipante
  const teamsPerParticipant = 2
  for (let i = 0; i < n; i++) {
    const t1 = serieATeams[i * teamsPerParticipant]
    const t2 = serieATeams[i * teamsPerParticipant + 1]
    const assigned = [t1, t2].filter(Boolean)
    assignments[i].gk_serie_a_teams = assigned
    const gks = porPlayers
      .filter(p => assigned.includes(p.serie_a_team ?? ''))
      .sort((a, b) => (b.fvm ?? 0) - (a.fvm ?? 0))
    assignments[i].players.push(...gks)
  }

  // Portieri eventualmente non assegnati (Serie A teams > 2×n)
  const assignedSerieATeams = new Set(assignments.flatMap(a => a.gk_serie_a_teams))
  const unassignedGks = porPlayers.filter(p => !assignedSerieATeams.has(p.serie_a_team ?? ''))

  // ─── RUOLI OUTFIELD ─────────────────────────────────────────
  for (const role of OUTFIELD_ROLES) {
    const rolePlayers = players.filter(p => p.primary_role === role)
    distributeBatches(rolePlayers, assignments)
  }

  return { assignments, unassigned: unassignedGks }
}

// Statistiche di riepilogo per un'assegnazione
export function draftStats(assignment: DraftTeamAssignment) {
  const byRole: Record<string, number> = {}
  for (const p of assignment.players) {
    byRole[p.primary_role] = (byRole[p.primary_role] ?? 0) + 1
  }
  const fvmTotal = assignment.players.reduce((s, p) => s + (p.fvm ?? 0), 0)
  return { byRole, fvmTotal, total: assignment.players.length }
}
