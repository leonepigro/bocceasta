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
  budget_remaining: number
}

export type DraftResult = {
  assignments: DraftTeamAssignment[]
}

const TOTAL_BUDGET = 500
const GK_PER_TEAM = 2
const MIN_OUTFIELD = 26
const MAX_OUTFIELD = 28

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

export function generateDraft(
  bocceastaTeams: Team[],
  rawPlayers: { id: number; name: string; roles: string[]; fvm: number | null; serie_a_team: string | null }[]
): DraftResult {
  const n = bocceastaTeams.length
  const teams = shuffle([...bocceastaTeams])
  const assignments: DraftTeamAssignment[] = teams.map(t => ({
    team: t, players: [], gk_serie_a_teams: [], budget_remaining: TOTAL_BUDGET,
  }))

  const players: DraftPlayer[] = rawPlayers
    .filter(p => p.roles.length > 0)
    .map(p => ({ ...p, primary_role: p.roles[0] }))

  // ─── PORTIERI: top 2 FVM dalle 2 squadre Serie A assegnate ──
  const porPlayers = players
    .filter(p => p.primary_role === 'Por')
    .sort((a, b) => (b.fvm ?? 0) - (a.fvm ?? 0))

  const serieATeams = shuffle(
    [...new Set(porPlayers.map(p => p.serie_a_team).filter(Boolean) as string[])]
  )

  for (let i = 0; i < n; i++) {
    const t1 = serieATeams[i * 2]
    const t2 = serieATeams[i * 2 + 1]
    const assigned = [t1, t2].filter(Boolean)
    assignments[i].gk_serie_a_teams = assigned
    const gks = porPlayers
      .filter(p => assigned.includes(p.serie_a_team ?? ''))
      .slice(0, GK_PER_TEAM)  // top 2 per FVM (già ordinati)
    assignments[i].players.push(...gks)
    assignments[i].budget_remaining = TOTAL_BUDGET - sumFvm(assignments[i].players)
  }

  // ─── OUTFIELD: ordinati per FVM globale, round obbligatori + opzionali ───
  const outfield = players
    .filter(p => p.primary_role !== 'Por')
    .sort((a, b) => (b.fvm ?? 0) - (a.fvm ?? 0))

  let playerIdx = 0

  for (let round = 1; round <= MAX_OUTFIELD; round++) {
    // Round 1-26: tutti. Round 27-28: solo chi ha budget > 0
    const eligible = round <= MIN_OUTFIELD
      ? assignments.map((_, i) => i)
      : assignments.map((a, i) => ({ i, budget: TOTAL_BUDGET - sumFvm(a.players) }))
          .filter(x => x.budget > 0)
          .map(x => x.i)

    if (eligible.length === 0) break

    const batch = outfield.slice(playerIdx, playerIdx + eligible.length)
    playerIdx += batch.length
    if (batch.length === 0) break

    const shuffledBatch = shuffle(batch)
    const shuffledEligible = shuffle([...eligible])
    shuffledBatch.forEach((player, j) => {
      assignments[shuffledEligible[j]].players.push(player)
    })
  }

  // Aggiorna budget_remaining finale
  for (const a of assignments) {
    a.budget_remaining = TOTAL_BUDGET - sumFvm(a.players)
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
  return { byRole, fvmTotal, total: assignment.players.length, outfieldCount, budgetRemaining: TOTAL_BUDGET - fvmTotal }
}
