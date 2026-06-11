export type SoldPlayerExport = {
  id: number
  name: string
  serie_a_team: string | null
  classic_role: string | null
  roles: string[]
  sold_price: number
  team_name: string
}

export function generateExportCsv(players: SoldPlayerExport[]): string {
  const header = 'Id;Nome;Squadra;Ruolo;Ruolo Mantra;Qt.A;Fantateam'
  const rows = players.map(p =>
    [p.id, p.name, p.serie_a_team ?? '', p.classic_role ?? '', p.roles.join(';'), p.sold_price, p.team_name].join(';')
  )
  return [header, ...rows].join('\n')
}

// Formato identico al CSV rose fantacalcio.it: team_name,player_id,1
export function generateRosterCsv(players: SoldPlayerExport[]): string {
  const sorted = [...players].sort((a, b) => a.team_name.localeCompare(b.team_name))
  return ['$,$,$', ...sorted.map(p => `${p.team_name},${p.id},1`)].join('\n')
}
