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

// Conflitto wishlist: ≥2 team avevano lo stesso giocatore in preferenza.
export type DraftConflict = {
  player_id: number
  player_name: string
  primary_role: string
  contenders: string[]   // team_name di chi aveva il giocatore in wishlist
  winner: string         // team_name che lo ha vinto
}

export type DraftResult = {
  assignments: DraftTeamAssignment[]
  conflicts?: DraftConflict[]
}

// Penalty per conflitto vinto: aggiunge ranking effettivo nei conflitti successivi.
const CONFLICT_WIN_PENALTY = 50

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

// Wishlist: per ogni giocatore, set di team che lo hanno in preferenza.
// Mappa indici team interni (dipende dall'ordine `assignments`).
export type Wishlist = Map<number, Set<number>>

// Distribuzione globale: scegli team col totale FVM più basso che ha slot per il ruolo.
// Wishlist: se ≥1 team eligibile ha il giocatore in preferenza, restringe a quelli.
// Conflitti veri (≥2 contendenti wishlist) → chi vince accumula penalty per i successivi.
function globalBalancedDistribute(
  allPlayers: DraftPlayer[],
  assignments: DraftTeamAssignment[],
  wishlist: Wishlist | null,
  conflicts: DraftConflict[]
): void {
  const n = assignments.length

  const roleCounts: Record<string, number> = {}
  for (const p of allPlayers) roleCounts[p.primary_role] = (roleCounts[p.primary_role] ?? 0) + 1
  const roleTarget: Record<string, number> = {}
  for (const [role, cnt] of Object.entries(roleCounts)) roleTarget[role] = Math.floor(cnt / n)

  const remaining: Record<string, number>[] = Array.from({ length: n }, () =>
    Object.fromEntries(Object.entries(roleTarget).map(([r, t]) => [r, t]))
  )

  const totalFvm: number[] = assignments.map(a =>
    a.players.reduce((s, p) => s + (p.fvm ?? 0), 0)
  )
  const conflictWins: number[] = new Array(n).fill(0)

  const sorted = [...allPlayers].sort((a, b) => (b.fvm ?? 0) - (a.fvm ?? 0))

  for (const player of sorted) {
    const role = player.primary_role

    let eligible = [...Array(n).keys()].filter(i => (remaining[i][role] ?? 0) > 0)
    if (eligible.length === 0) continue

    let isConflict = false
    let contendersIdx: number[] = []

    const fans = wishlist?.get(player.id)
    if (fans && fans.size > 0) {
      // Equità: wishlist applica solo se team è a/sotto la media corrente.
      // Chi sta accumulando top player non può sforare la media tramite wishlist.
      const avg = totalFvm.reduce((s, v) => s + v, 0) / n
      const wishedAndEligible = eligible.filter(i => fans.has(i) && totalFvm[i] <= avg)
      if (wishedAndEligible.length > 0) {
        eligible = wishedAndEligible
        contendersIdx = wishedAndEligible
        isConflict = wishedAndEligible.length >= 2
      }
    }

    eligible.sort((a, b) => {
      // Durante conflitto vero: penalizza chi ha già vinto conflitti precedenti
      const aScore = totalFvm[a] + (isConflict ? conflictWins[a] * CONFLICT_WIN_PENALTY : 0)
      const bScore = totalFvm[b] + (isConflict ? conflictWins[b] * CONFLICT_WIN_PENALTY : 0)
      const diff = aScore - bScore
      return diff + (Math.random() - 0.5) * 5
    })

    const pick = eligible[0]
    assignments[pick].players.push(player)
    totalFvm[pick] += player.fvm ?? 0
    remaining[pick][role]--

    if (isConflict) {
      conflictWins[pick]++
      conflicts.push({
        player_id: player.id,
        player_name: player.name,
        primary_role: player.primary_role,
        contenders: contendersIdx.map(i => assignments[i].team.team_name),
        winner: assignments[pick].team.team_name,
      })
    }
  }
}

// rawPreferences: array di (team_id Bocceasta, player_id) preferenze utenti.
// Vengono convertite in Wishlist indicizzata sull'ordine `assignments` (shufflato).
function buildWishlist(
  assignments: DraftTeamAssignment[],
  rawPreferences: { team_id: string; player_id: number }[]
): Wishlist {
  const teamIdToIndex = new Map<string, number>()
  assignments.forEach((a, i) => teamIdToIndex.set(a.team.id, i))
  const w: Wishlist = new Map()
  for (const { team_id, player_id } of rawPreferences) {
    const idx = teamIdToIndex.get(team_id)
    if (idx === undefined) continue
    const set = w.get(player_id) ?? new Set<number>()
    set.add(idx)
    w.set(player_id, set)
  }
  return w
}

function generateSingleDraft(
  bocceastaTeams: Team[],
  rawPlayers: { id: number; name: string; roles: string[]; fvm: number | null; serie_a_team: string | null }[],
  rawPreferences: { team_id: string; player_id: number }[] = []
): DraftResult {
  const n = bocceastaTeams.length
  const teams = shuffle([...bocceastaTeams])
  const assignments: DraftTeamAssignment[] = teams.map(t => ({
    team: t, players: [], gk_serie_a_teams: [],
  }))
  const wishlist = buildWishlist(assignments, rawPreferences)

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
  const conflicts: DraftConflict[] = []
  globalBalancedDistribute(allOutfield, assignments, wishlist, conflicts)

  return { assignments, conflicts }
}

// FVM totale rosa (portieri inclusi)
function totalRosterFvm(a: DraftTeamAssignment): number {
  return a.players.reduce((s, p) => s + (p.fvm ?? 0), 0)
}

// Best-of-N: genera 100 sorteggi candidati, ritorna quello con minor range FVM totale.
// Wishlist preferenze applicata in tie-breaking — equità totale comunque garantita.
export function generateDraft(
  bocceastaTeams: Team[],
  rawPlayers: Parameters<typeof generateSingleDraft>[1],
  rawPreferences: { team_id: string; player_id: number }[] = []
): DraftResult {
  const N_CANDIDATES = 100
  let best: DraftResult | null = null
  let bestSpread = Infinity

  for (let i = 0; i < N_CANDIDATES; i++) {
    const candidate = generateSingleDraft(bocceastaTeams, rawPlayers, rawPreferences)
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
