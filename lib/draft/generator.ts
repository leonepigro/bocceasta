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
export type DraftConflictContender = {
  team_name: string
  quotazione: number    // quotazione rosa al momento del conflitto
  penalty_wins: number  // vittorie conflitti già accumulate (prima di questo)
  score: number         // quotazione + penalty_wins * 50
  won: boolean
}

export type DraftConflict = {
  player_id: number
  player_name: string
  primary_role: string
  contenders: string[]   // team_name (backward compat)
  winner: string
  // Campi dettaglio — assenti nei sorteggi salvati prima della v3
  avg_quotazione?: number
  contenders_detail?: DraftConflictContender[]
  excluded_over_avg?: { team_name: string; quotazione: number }[]
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
// Multi-ruolo: se il primario è pieno, scala al secondario/terziario disponibile.
// Wishlist: se ≥1 team eligibile ha il giocatore in preferenza, restringe a quelli.
// Conflitti veri (≥2 contendenti wishlist) → chi vince accumula penalty per i successivi.
function globalBalancedDistribute(
  allPlayers: DraftPlayer[],
  candidateRoles: string[],     // ruoli ammessi per questa fase (outfield)
  assignments: DraftTeamAssignment[],
  wishlist: Wishlist | null,
  conflicts: DraftConflict[]
): void {
  const n = assignments.length

  // Pre-conteggio target per ruolo: basato sui ruoli primari di tutti i giocatori
  const roleCounts: Record<string, number> = {}
  for (const p of allPlayers) {
    if (candidateRoles.includes(p.primary_role)) {
      roleCounts[p.primary_role] = (roleCounts[p.primary_role] ?? 0) + 1
    }
  }
  const roleTarget: Record<string, number> = {}
  for (const r of candidateRoles) roleTarget[r] = Math.floor((roleCounts[r] ?? 0) / n)

  const remaining: Record<string, number>[] = Array.from({ length: n }, () =>
    Object.fromEntries(candidateRoles.map(r => [r, roleTarget[r]]))
  )

  const totalFvm: number[] = assignments.map(a =>
    a.players.reduce((s, p) => s + (p.fvm ?? 0), 0)
  )
  const conflictWins: number[] = new Array(n).fill(0)

  const sorted = [...allPlayers].sort((a, b) => (b.fvm ?? 0) - (a.fvm ?? 0))

  for (const player of sorted) {
    // Lista ruoli giocabili: primario prima, poi secondari (solo se in candidateRoles)
    const tryRoles = player.roles.filter(r => candidateRoles.includes(r))
    if (tryRoles.length === 0) continue

    let placed = false
    for (const role of tryRoles) {
      let eligible = [...Array(n).keys()].filter(i => (remaining[i][role] ?? 0) > 0)
      if (eligible.length === 0) continue

      let isConflict = false
      let contendersIdx: number[] = []
      let capturedAvg = 0
      let capturedFansWithSlot: number[] = []

      const fans = wishlist?.get(player.id)
      if (fans && fans.size > 0) {
        capturedAvg = totalFvm.reduce((s, v) => s + v, 0) / n
        // Fan che hanno slot per questo ruolo (sia sopra che sotto media)
        capturedFansWithSlot = eligible.filter(i => fans.has(i))
        const wishedAndEligible = capturedFansWithSlot.filter(i => totalFvm[i] <= capturedAvg)
        if (wishedAndEligible.length > 0) {
          eligible = wishedAndEligible
          contendersIdx = wishedAndEligible
          isConflict = wishedAndEligible.length >= 2
        }
      }

      eligible.sort((a, b) => {
        const aScore = totalFvm[a] + (isConflict ? conflictWins[a] * CONFLICT_WIN_PENALTY : 0)
        const bScore = totalFvm[b] + (isConflict ? conflictWins[b] * CONFLICT_WIN_PENALTY : 0)
        const diff = aScore - bScore
        return diff + (Math.random() - 0.5) * 5
      })

      const pick = eligible[0]

      // Dettaglio conflitto calcolato PRIMA dell'assegnazione per avere quotazioni corrette
      let contendersDetail: DraftConflictContender[] | undefined
      let excludedOverAvg: { team_name: string; quotazione: number }[] | undefined
      if (isConflict) {
        contendersDetail = contendersIdx.map(i => ({
          team_name: assignments[i].team.team_name,
          quotazione: totalFvm[i],
          penalty_wins: conflictWins[i],
          score: totalFvm[i] + conflictWins[i] * CONFLICT_WIN_PENALTY,
          won: i === pick,
        }))
        // Fan con slot ma sopra media → esclusi dal conflitto
        excludedOverAvg = capturedFansWithSlot
          .filter(i => totalFvm[i] > capturedAvg)
          .map(i => ({ team_name: assignments[i].team.team_name, quotazione: totalFvm[i] }))
      }

      // Salva il giocatore con il ruolo effettivamente occupato
      assignments[pick].players.push({ ...player, primary_role: role })
      totalFvm[pick] += player.fvm ?? 0
      remaining[pick][role]--

      if (isConflict) {
        conflictWins[pick]++
        conflicts.push({
          player_id: player.id,
          player_name: player.name,
          primary_role: role,
          contenders: contendersIdx.map(i => assignments[i].team.team_name),
          winner: assignments[pick].team.team_name,
          avg_quotazione: Math.round(capturedAvg),
          contenders_detail: contendersDetail,
          excluded_over_avg: excludedOverAvg,
        })
      }
      placed = true
      break
    }
    void placed // soft fail: giocatore non collocato se nessun ruolo ha slot
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

  // Forma coppie casuali di squadre Serie A prima del greedy:
  // shuffla separatamente la metà alta e bassa per topFvm, poi le accoppia.
  // Così ogni sorteggio produce abbinamenti diversi (Roma+Pisa non è fisso).
  const gkSlotsSorted = [...gkSlots].sort((a, b) => b.topFvm - a.topFvm)
  const midpoint = Math.ceil(gkSlotsSorted.length / 2)
  const topGk = shuffle(gkSlotsSorted.slice(0, midpoint))
  const bottomGk = shuffle(gkSlotsSorted.slice(midpoint))
  type GkPair = typeof gkSlots
  const gkPairs: GkPair[] = Array.from(
    { length: Math.max(topGk.length, bottomGk.length) },
    (_, i) => ([topGk[i], bottomGk[i]].filter(Boolean) as GkPair)
  ).filter(p => p.length > 0)
  // La coppia con FVM combinato più alto viene assegnata per prima (bilancia comunque)
  gkPairs.sort((a, b) =>
    b.reduce((s, x) => s + x.topFvm, 0) - a.reduce((s, x) => s + x.topFvm, 0)
  )

  const totalFvm: number[] = new Array(n).fill(0)
  const serieATeamsCount: number[] = new Array(n).fill(0)

  for (const pair of gkPairs) {
    const eligible = [...Array(n).keys()].filter(
      i => serieATeamsCount[i] + pair.length <= GK_SERIE_A_TEAMS_PER_PARTICIPANT
    )
    if (eligible.length === 0) break

    eligible.sort((a, b) => {
      const diff = totalFvm[a] - totalFvm[b]
      return diff + (Math.random() - 0.5) * 5
    })

    const pick = eligible[0]
    for (const slot of pair) {
      assignments[pick].gk_serie_a_teams.push(slot.serieATeam)
      for (const gk of slot.players) {
        assignments[pick].players.push(gk)
        totalFvm[pick] += gk.fvm ?? 0
      }
      serieATeamsCount[pick]++
    }
  }

  // ─── OUTFIELD: include tutti i giocatori che hanno almeno un ruolo outfield ───
  // I multi-ruolo (es. Cabal: B, Ds, E) possono fallback su secondario se primario pieno.
  const allOutfield = players.filter(p =>
    p.roles.some(r => OUTFIELD_ROLES.includes(r))
  )
  const conflicts: DraftConflict[] = []
  globalBalancedDistribute(allOutfield, OUTFIELD_ROLES, assignments, wishlist, conflicts)

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
