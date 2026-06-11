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
// Ruoli distribuiti dal più alto FVM al più basso: prima i top player (Pc, A) che
// creano più varianza — il bilanciamento li compensa subito. Ultimi i difensori
// (FVM basso, varianza minima) dove l'effetto sull'equilibrio è trascurabile.
const OUTFIELD_ROLES = ['Pc', 'A', 'T', 'W', 'M', 'C', 'E', 'Dc', 'B', 'Dd', 'Ds']

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

// Distribuisce pool in batch da n.
// outfieldFvm[i] traccia solo il FVM degli outfield: esclude portieri (assegnati casualmente)
// per non distorcere il bilanciamento.
function balancedDistribute(
  pool: DraftPlayer[],
  assignments: DraftTeamAssignment[],
  outfieldFvm: number[]
): void {
  const n = assignments.length
  const rounds = Math.floor(pool.length / n)
  const take = rounds * n
  const sorted = [...pool]
    .sort((a, b) => (b.fvm ?? 0) - (a.fvm ?? 0))
    .slice(0, take)

  for (let i = 0; i < take; i += n) {
    const batch = sorted.slice(i, i + n)
    const order = [...Array(n).keys()].sort((a, b) => {
      const diff = outfieldFvm[a] - outfieldFvm[b]
      return Math.abs(diff) < 30 ? diff + (Math.random() - 0.5) * 40 : diff
    })
    batch.forEach((player, j) => {
      assignments[order[j]].players.push(player)
      outfieldFvm[order[j]] += player.fvm ?? 0
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

  // outfieldFvm[i] = FVM solo degli outfield — esclude portieri per non distorcere il bilanciamento
  const outfieldFvm = new Array(n).fill(0)

  // ─── OUTFIELD: per ogni ruolo, ordine team shufflato a sorte, poi batch bilanciati ──
  for (const role of OUTFIELD_ROLES) {
    const pool = players
      .filter(p => p.primary_role === role && !assignedIds.has(p.id))
    // Shuffle → mappa gli indici originali per mantenere il link a outfieldFvm[i]
    const shuffledIdx = shuffle([...Array(n).keys()])
    const roleAssignments = shuffledIdx.map(i => assignments[i])
    const roleOutfieldFvm = shuffledIdx.map(i => outfieldFvm[i])
    balancedDistribute(pool, roleAssignments, roleOutfieldFvm)
    // Riscrivi outfieldFvm originale con i valori aggiornati
    shuffledIdx.forEach((origIdx, j) => { outfieldFvm[origIdx] = roleOutfieldFvm[j] })
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
