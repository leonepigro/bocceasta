import * as XLSX from 'xlsx'
import type { PlayerImport } from '@/lib/supabase/types'

export function parsePlayersXlsx(buffer: Buffer | ArrayBuffer): PlayerImport[] {
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const ws = wb.Sheets['Tutti']
  if (!ws) throw new Error('Sheet "Tutti" not found in Excel file')

  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null }) as unknown[][]

  // Row 1 = headers (row 0 = titolo merged)
  const headerRow = (rows[1] ?? []).map(h => String(h ?? '').trim().toLowerCase())

  // Trova colonne per nome — fallback agli indici storici
  const colFvm = headerRow.findIndex(h => h === 'fvm' || h === 'qt.a m' || h === 'qt.a') !== -1
    ? headerRow.findIndex(h => h === 'fvm' || h === 'qt.a m' || h === 'qt.a')
    : 11
  const colId   = headerRow.findIndex(h => h === 'id') !== -1 ? headerRow.findIndex(h => h === 'id') : 0
  const colR    = headerRow.findIndex(h => h === 'r')  !== -1 ? headerRow.findIndex(h => h === 'r')  : 1
  const colRm   = headerRow.findIndex(h => h === 'rm') !== -1 ? headerRow.findIndex(h => h === 'rm') : 2
  const colNome = headerRow.findIndex(h => h === 'nome') !== -1 ? headerRow.findIndex(h => h === 'nome') : 3
  const colSq   = headerRow.findIndex(h => h === 'squadra' || h === 'sq') !== -1
    ? headerRow.findIndex(h => h === 'squadra' || h === 'sq')
    : 4

  const dataRows = rows.slice(2)
  const players: PlayerImport[] = []

  for (const row of dataRows) {
    const id = row[colId]
    if (!id || typeof id !== 'number') continue

    const classicRole = row[colR] ? String(row[colR]) : null
    const rmRaw = row[colRm] ? String(row[colRm]) : ''
    const roles = rmRaw ? rmRaw.split(';').map(r => r.trim()).filter(Boolean) : []
    const name = row[colNome] ? String(row[colNome]) : ''
    const serieATeam = row[colSq] ? String(row[colSq]) : null
    const fvm = typeof row[colFvm] === 'number' ? row[colFvm] : null

    if (!name) continue

    players.push({ id, name, serie_a_team: serieATeam, roles, classic_role: classicRole, fvm, presenze: null })
  }

  return players
}

// Ritorna gli header trovati — utile per debug in admin
export function inspectXlsxHeaders(buffer: Buffer | ArrayBuffer): string[] {
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const ws = wb.Sheets['Tutti']
  if (!ws) return []
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null }) as unknown[][]
  return (rows[1] ?? []).map((h, i) => `${i}: ${String(h ?? '')}`)
}
