import type { Formation } from './formations'

export type PlayerNode = {
  id: number
  name: string
  roles: string[]
  fvm: number | null
}

export type FormationResult = {
  formation: Formation
  filled: number        // slot coperti (max 11)
  total: number         // sempre 11
  slotToPlayer: (number | null)[]  // playerIdx per ogni slot, null = scoperto
  missingSlots: { index: number; label: string; roles: string[] }[]
}

// Augmenting path bipartite matching
function maxMatch(
  playerRoles: string[][],
  slotRoles: string[][]
): { filled: number; slotToPlayer: (number | null)[] } {
  const n = slotRoles.length
  const m = playerRoles.length
  const slotToPlayer = new Array<number | null>(n).fill(null)

  function dfs(pIdx: number, visited: boolean[]): boolean {
    for (let sIdx = 0; sIdx < n; sIdx++) {
      if (visited[sIdx]) continue
      if (!playerRoles[pIdx].some(r => slotRoles[sIdx].includes(r))) continue
      visited[sIdx] = true
      const occupant = slotToPlayer[sIdx]
      if (occupant === null || dfs(occupant, visited)) {
        slotToPlayer[sIdx] = pIdx
        return true
      }
    }
    return false
  }

  let filled = 0
  for (let p = 0; p < m; p++) {
    const visited = new Array<boolean>(n).fill(false)
    if (dfs(p, visited)) filled++
  }

  return { filled, slotToPlayer }
}

export function analyzeFormations(
  rosterPlayers: PlayerNode[],
  formations: Formation[]
): FormationResult[] {
  const playerRoles = rosterPlayers.map(p => p.roles)

  return formations
    .map(formation => {
      const slotRoles = formation.slots.map(s => s.roles)
      const { filled, slotToPlayer } = maxMatch(playerRoles, slotRoles)
      const missingSlots = formation.slots
        .map((slot, i) => ({ index: i, label: slot.label, roles: slot.roles, filled: slotToPlayer[i] !== null }))
        .filter(s => !s.filled)
        .map(({ index, label, roles }) => ({ index, label, roles }))

      return { formation, filled, total: 11, slotToPlayer, missingSlots }
    })
    .sort((a, b) => b.filled - a.filled)
}

// Per ogni slot mancante, trova i migliori giocatori liberi (non in rosa)
export function suggestForMissing(
  missing: { label: string; roles: string[] }[],
  freePlayers: PlayerNode[]
): { slot: { label: string; roles: string[] }; suggestions: PlayerNode[] }[] {
  return missing.map(slot => {
    const suggestions = freePlayers
      .filter(p => p.roles.some(r => slot.roles.includes(r)))
      .sort((a, b) => (b.fvm ?? 0) - (a.fvm ?? 0))
      .slice(0, 5)
    return { slot, suggestions }
  })
}
