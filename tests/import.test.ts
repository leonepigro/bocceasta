import { describe, it, expect } from 'vitest'
import { parsePlayersXlsx } from '@/lib/players/import'
import * as XLSX from 'xlsx'

function makeWorkbook(rows: unknown[][]) {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(rows)
  XLSX.utils.book_append_sheet(wb, ws, 'Tutti')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

describe('parsePlayersXlsx', () => {
  it('parses a single player row correctly', () => {
    const buf = makeWorkbook([
      ['Quotazioni Fantacalcio Stagione 2025 26'],
      ['Id', 'R', 'RM', 'Nome', 'Squadra', 'Qt.A', 'Qt.I', 'Diff.', 'Qt.A M', 'Qt.I M', 'Diff.M', 'FVM', 'FVM M'],
      [4431, 'P', 'Por', 'Carnesecchi', 'Atalanta', 18, 14, 4, 18, 14, 4, 80, 80],
    ])
    const players = parsePlayersXlsx(buf)
    expect(players).toHaveLength(1)
    expect(players[0]).toEqual({
      id: 4431,
      name: 'Carnesecchi',
      serie_a_team: 'Atalanta',
      roles: ['Por'],
      classic_role: 'P',
      fvm: 80,
    })
  })

  it('splits multi-role players by semicolon', () => {
    const buf = makeWorkbook([
      ['Title'],
      ['Id', 'R', 'RM', 'Nome', 'Squadra', 'Qt.A', 'Qt.I', 'Diff.', 'Qt.A M', 'Qt.I M', 'Diff.M', 'FVM', 'FVM M'],
      [999, 'D', 'Dd;Dc', 'TestPlayer', 'Roma', 10, 8, 2, 10, 8, 2, 25, 25],
    ])
    const players = parsePlayersXlsx(buf)
    expect(players[0].roles).toEqual(['Dd', 'Dc'])
  })

  it('skips rows with missing id', () => {
    const buf = makeWorkbook([
      ['Title'],
      ['Id', 'R', 'RM', 'Nome', 'Squadra', 'Qt.A', 'Qt.I', 'Diff.', 'Qt.A M', 'Qt.I M', 'Diff.M', 'FVM', 'FVM M'],
      [null, 'P', 'Por', 'NoId', 'Milan', 5, 3, 2, 5, 3, 2, 10, 10],
      [123, 'A', 'W;A', 'Valid', 'Juventus', 8, 6, 2, 8, 6, 2, 20, 20],
    ])
    const players = parsePlayersXlsx(buf)
    expect(players).toHaveLength(1)
    expect(players[0].id).toBe(123)
  })

  it('handles null fvm gracefully', () => {
    const buf = makeWorkbook([
      ['Title'],
      ['Id', 'R', 'RM', 'Nome', 'Squadra', 'Qt.A', 'Qt.I', 'Diff.', 'Qt.A M', 'Qt.I M', 'Diff.M', 'FVM', 'FVM M'],
      [456, 'C', 'M', 'NullFvm', 'Napoli', 5, 3, 2, 5, 3, 2, null, null],
    ])
    const players = parsePlayersXlsx(buf)
    expect(players[0].fvm).toBeNull()
  })
})
