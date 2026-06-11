'use client'
import { useTransition } from 'react'
import { getExportData } from '@/lib/admin/actions'
import { generateExportCsv, generateRosterCsv } from '@/lib/export/csv'
import type { SoldPlayerExport } from '@/lib/export/csv'

export function ExportSection() {
  const [isPending, startTransition] = useTransition()

  async function fetchData(): Promise<SoldPlayerExport[] | null> {
    const result = await getExportData()
    if ('error' in result) { alert(result.error); return null }
    return (result.data ?? []).map((p: {
      id: number; name: string; serie_a_team: string | null
      classic_role: string | null; roles: string[]; sold_price: number
      teams: { team_name: string } | null
    }) => ({
      id: p.id, name: p.name, serie_a_team: p.serie_a_team,
      classic_role: p.classic_role, roles: p.roles,
      sold_price: p.sold_price, team_name: p.teams?.team_name ?? '',
    }))
  }

  function download(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  function handleExportDetailed() {
    startTransition(async () => {
      const data = await fetchData()
      if (!data) return
      download(generateExportCsv(data), `rose-dettaglio-${new Date().toISOString().slice(0, 10)}.csv`)
    })
  }

  function handleExportRoster() {
    startTransition(async () => {
      const data = await fetchData()
      if (!data) return
      download(generateRosterCsv(data), `rose-fantacalcio-${new Date().toISOString().slice(0, 10)}.csv`)
    })
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Export rose</h2>
      <div className="space-y-4">
        <div className="border rounded-lg p-4">
          <p className="text-sm font-medium mb-1">Formato rose fantacalcio.it</p>
          <p className="text-xs text-gray-400 mb-3">
            CSV <code>team_name,player_id,1</code> — stesso formato del file rose importato. Reimportabile su fantacalcio.it.
          </p>
          <button onClick={handleExportRoster} disabled={isPending}
            className="text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
            style={{ background: 'var(--boccea-red)' }}>
            {isPending ? 'Generazione...' : '⬇ Scarica rose (fantacalcio.it)'}
          </button>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-sm font-medium mb-1">Formato dettagliato</p>
          <p className="text-xs text-gray-400 mb-3">CSV con nome, ruolo, quotazione e squadra bocceasta.</p>
          <button onClick={handleExportDetailed} disabled={isPending}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">
            {isPending ? 'Generazione...' : '⬇ Scarica dettaglio'}
          </button>
        </div>
      </div>
    </div>
  )
}
