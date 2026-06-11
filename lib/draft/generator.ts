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

// Tutti i ruoli outfield — l'ordine non conta più, la distribuzione è globale per FVM
const OUTFIELD_ROLES = ['Pc', 'A', 'T', 'W', 'M', 'C', 'E', 'Dc', 'B', 'Dd', 'Ds']

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Assegnazione globale per FVM: tutti i giocatori outfield ordinati FVM desc,
// ogni giocatore va al team con outfield FVM più basso che ha ancora slot per quel ruolo.
// Garantisce che i top player vadano a team diversi indipendentemente dal ruolo.
function globalBalancedDistribute(
  allOutfield: DraftPlayer[],
  assignments: DraftTeamAssignment[]
): void {
  const n = assignments.length

  // Calcola quanti slot per ruolo per team (floor = uguale per tutti)
  const roleCounts: Record<string, number> = {}
  for (const p of allOutfield) roleCounts[p.primary_role] = (roleCounts[p.primary_role] ?? 0) + 1
  const roleTarget: Record<string, number> = {}
  for (const [role, cnt] of Object.entries(roleCounts)) roleTarget[role] = Math.floor(cnt / n)

  // Slot rimanenti per ruolo per team: remaining[teamIdx][role]
  const remaining: Record<string, number>[] = Array.from({ length: n }, () =>
    Object.fromEntries(Object.entries(roleTarget).map(([r, t]) => [r, t]))
  )

  const outfieldFvm = new Array(n).fill(0)

  // Ordina globalmente per FVM desc
  const sorted = [...allOutfield].sort((a, b) => (b.fvm ?? 0) - (a.fvm ?? 0))

  for (const player of sorted) {
    const role = player.primary_role

    // Team eligibili: hanno ancora slot per questo ruolo
    const eligible = [...Array(n).keys()].filter(i => (remaining[i][role] ?? 0) > 0)
    if (eligible.length === 0) continue

    // Ordina per outfield FVM crescente con piccolo rumore (tie-breaking casuale)
    eligible.sort((a, b) => {
      const diff = outfieldFvm[a] - outfieldFvm[b]
      return diff + (Math.random() - 0.5) * 5
    })

    const pick = eligible[0]
    assignments[pick].players.push(player)
    outfieldFvm[pick] += player.fvm ?? 0
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

  const assignedIds = new Set<number>()

  // ─── PORTIERI ───
  const porPlayers = players
    .filter(p => p.primary_role === 'Por')
    .sort((a, b) => (b.fvm ?? 0) - (a.fvm ?? 0))

  const serieATeams = shuffle(
    [...new Set(porPlayers.map(p => p.serie_a_team).filter(Boolean) as string[])]
  )

  for (let i = 0; i < n; i++) {
    const assigned = [serieATeams[i * 2], serieATeams[i * 2 + 1]].filter(Boolean)
    assignments[i].gk_serie_a_teams = assigned
    const gks = porPlayers.filter(p => assigned.includes(p.serie_a_team ?? ''))
    for (const gk of gks) { assignments[i].players.push(gk); assignedIds.add(gk.id) }
  }

  // ─── OUTFIELD ───
  const allOutfield = players.filter(p =>
    OUTFIELD_ROLES.includes(p.primary_role) && !assignedIds.has(p.id)
  )
  globalBalancedDistribute(allOutfield, assignments)
  allOutfield.forEach(p => assignedIds.add(p.id))

  return { assignments }
}

// Calcola FVM outfield (esclude portieri)
function outfieldFvm(a: DraftTeamAssignment): number {
  return a.players
    .filter(p => p.primary_role !== 'Por')
    .reduce((s, p) => s + (p.fvm ?? 0), 0)
}

// Best-of-N: genera 100 sorteggi candidati, ritorna quello con minor range FVM outfield.
// Casualità preservata (ogni run è random), ma scegliamo il più equo.
export function generateDraft(
  bocceastaTeams: Team[],
  rawPlayers: Parameters<typeof generateSingleDraft>[1]
): DraftResult {
  const N_CANDIDATES = 100
  let best: DraftResult | null = null
  let bestSpread = Infinity

  for (let i = 0; i < N_CANDIDATES; i++) {
    const candidate = generateSingleDraft(bocceastaTeams, rawPlayers)
    const fvms = candidate.assignments.map(outfieldFvm)
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
