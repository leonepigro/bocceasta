import { describe, it, expect } from 'vitest'
import { generateExportCsv } from '@/lib/export/csv'

describe('generateExportCsv', () => {
  it('generates correct CSV header', () => {
    const csv = generateExportCsv([])
    expect(csv.split('\n')[0]).toBe('Id;Nome;Squadra;Ruolo;Ruolo Mantra;Qt.A;Fantateam')
  })

  it('generates correct row for sold player', () => {
    const csv = generateExportCsv([{
      id: 4431,
      name: 'Carnesecchi',
      serie_a_team: 'Atalanta',
      classic_role: 'P',
      roles: ['Por'],
      sold_price: 18,
      team_name: 'FC Boccea',
    }])
    const lines = csv.split('\n')
    expect(lines[1]).toBe('4431;Carnesecchi;Atalanta;P;Por;18;FC Boccea')
  })

  it('joins multiple mantra roles with semicolon', () => {
    const csv = generateExportCsv([{
      id: 999,
      name: 'Multi',
      serie_a_team: 'Roma',
      classic_role: 'D',
      roles: ['Dd', 'Dc'],
      sold_price: 10,
      team_name: 'Test FC',
    }])
    expect(csv.split('\n')[1]).toContain('Dd;Dc')
  })

  it('handles null serie_a_team', () => {
    const csv = generateExportCsv([{
      id: 1,
      name: 'Test',
      serie_a_team: null,
      classic_role: 'A',
      roles: ['W'],
      sold_price: 5,
      team_name: 'FC Test',
    }])
    expect(csv.split('\n')[1]).toBe('1;Test;;A;W;5;FC Test')
  })
})
