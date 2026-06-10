export function parseRosterCsv(csvText: string): Map<string, number[]> {
  const result = new Map<string, number[]>()
  for (const line of csvText.split('\n')) {
    const parts = line.split(',')
    if (parts.length < 2) continue
    const teamName = parts[0].trim()
    const playerId = parseInt(parts[1].trim())
    if (!teamName || teamName === '$' || isNaN(playerId)) continue
    if (!result.has(teamName)) result.set(teamName, [])
    result.get(teamName)!.push(playerId)
  }
  return result
}

export function getCsvTeamNames(csvText: string): string[] {
  return Array.from(parseRosterCsv(csvText).keys()).sort()
}
