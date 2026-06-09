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
    [
      p.id,
      p.name,
      p.serie_a_team ?? '',
      p.classic_role ?? '',
      p.roles.join(';'),
      p.sold_price,
      p.team_name,
    ].join(';')
  )
  return [header, ...rows].join('\n')
}
