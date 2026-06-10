import * as XLSX from 'xlsx'
import type { PlayerImport } from '@/lib/supabase/types'

export function parsePlayersXlsx(buffer: Buffer | ArrayBuffer): PlayerImport[] {
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const ws = wb.Sheets['Tutti']
  if (!ws) throw new Error('Sheet "Tutti" not found in Excel file')

  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null }) as unknown[][]
  const dataRows = rows.slice(2) // skip title + header rows

  const players: PlayerImport[] = []
  for (const row of dataRows) {
    const id = row[0]
    if (!id || typeof id !== 'number') continue

    const classicRole = row[1] ? String(row[1]) : null
    const rmRaw = row[2] ? String(row[2]) : ''
    const roles = rmRaw ? rmRaw.split(';').map(r => r.trim()).filter(Boolean) : []
    const name = row[3] ? String(row[3]) : ''
    const serieATeam = row[4] ? String(row[4]) : null
    const fvm = typeof row[11] === 'number' ? row[11] : null
    // Col 5 = Pv (Partite al voto)
    const presenze = typeof row[5] === 'number' ? row[5] : null

    if (!name) continue

    players.push({ id, name, serie_a_team: serieATeam, roles, classic_role: classicRole, fvm, presenze })
  }

  return players
}
