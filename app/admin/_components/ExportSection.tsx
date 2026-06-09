'use client'
import { useTransition } from 'react'
import { getExportData } from '@/lib/admin/actions'
import { generateExportCsv } from '@/lib/export/csv'
import type { SoldPlayerExport } from '@/lib/export/csv'

export function ExportSection() {
  const [isPending, startTransition] = useTransition()

  function handleExport() {
    startTransition(async () => {
      const result = await getExportData()
      if ('error' in result) { alert(result.error); return }

      const exportData: SoldPlayerExport[] = (result.data ?? []).map((p: {
        id: number
        name: string
        serie_a_team: string | null
        classic_role: string | null
        roles: string[]
        sold_price: number
        teams: { team_name: string } | null
      }) => ({
        id: p.id,
        name: p.name,
        serie_a_team: p.serie_a_team,
        classic_role: p.classic_role,
        roles: p.roles,
        sold_price: p.sold_price,
        team_name: p.teams?.team_name ?? '',
      }))

      const csv = generateExportCsv(exportData)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `asta-fc-boccea-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    })
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Export fantacalcio.it</h2>
      <p className="text-sm text-gray-500 mb-4">
        Scarica il CSV con tutti i giocatori venduti, pronto per l&apos;import su fantacalcio.it.
      </p>
      <button
        onClick={handleExport}
        disabled={isPending}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
      >
        {isPending ? 'Generazione...' : 'Scarica CSV'}
      </button>
    </div>
  )
}
