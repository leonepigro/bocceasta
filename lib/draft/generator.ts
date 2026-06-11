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

// Giocatori per ruolo per squadra (26 outfield totali)
const ROLE_TARGETS: Record<string, number> = {
  Dc: 4, B: 1, Dd: 1, Ds: 1,
  E: 3, M: 3, C: 3,
  T: 2, W: 2,
  A: 3, Pc: 3,
}
const GK_PER_TEAM = 2
const BALANCE_ROUNDS = 2 // round 27 e 28 per pareggiare

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

// Snake draft: distribuisce players ai team in ordine serpentina per FVM
function snakeDraft(
  pool: DraftPlayer[],        // già ordinati per FVM desc
  teamCount: number,
  countPerTeam: number,
  assignTo: (teamIdx: number, player: DraftPlayer) => void
): Set<number> {
  const assigned = new Set<number>()
  const take = Math.min(pool.length, countPerTeam * teamCount)
  let idx = 0
  let order = [...Array(teamCount).keys()]

  for (let round = 0; round < countPerTeam && idx < take; round++) {
    for (const teamIdx of order) {
      if (idx >= take) break
      assignTo(teamIdx, pool[idx])
      assigned.add(pool[idx].id)
      idx++
    }
    order = [...order].reverse()
  }
  return assigned
}

export function generateDraft(
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
      .slice(0, GK_PER_TEAM)
    for (const gk of gks) {
      assignments[i].players.push(gk)
      assignedIds.add(gk.id)
    }
  }

  // ─── OUTFIELD: snake draft per ruolo ───────────────────────
  for (const [role, countPerTeam] of Object.entries(ROLE_TARGETS)) {
    const pool = players
      .filter(p => p.primary_role === role && !assignedIds.has(p.id))
      .sort((a, b) => (b.fvm ?? 0) - (a.fvm ?? 0))

    const ids = snakeDraft(pool, n, countPerTeam, (teamIdx, player) => {
      assignments[teamIdx].players.push(player)
    })
    ids.forEach(id => assignedIds.add(id))
  }

  // ─── ROUND 27-28: bilancio FVM (i team più bassi prendono i migliori rimasti) ──
  const remaining = players
    .filter(p => p.primary_role !== 'Por' && !assignedIds.has(p.id))
    .sort((a, b) => (b.fvm ?? 0) - (a.fvm ?? 0))

  let remIdx = 0
  for (let round = 0; round < BALANCE_ROUNDS && remIdx < remaining.length; round++) {
    // Ordina i team per FVM totale crescente → chi ha meno prende i migliori rimasti
    const order = [...Array(n).keys()].sort(
      (a, b) => sumFvm(assignments[a].players) - sumFvm(assignments[b].players)
    )
    for (const teamIdx of order) {
      if (remIdx >= remaining.length) break
      assignments[teamIdx].players.push(remaining[remIdx++])
    }
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
