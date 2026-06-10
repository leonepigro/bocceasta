'use client'
import { useState, useTransition } from 'react'
import { importLeague, deleteLeague } from '@/lib/leagues/actions'
import { useRouter } from 'next/navigation'

type League = {
  id: string
  name: string
  csv_team_name: string
  created_at: string
}

type Props = {
  leagues: League[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function LeagueSelector({ leagues, selectedId, onSelect }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(leagues.length === 0)

  // Form state
  const [csvText, setCsvText] = useState('')
  const [leagueName, setLeagueName] = useState('')
  const [csvTeams, setCsvTeams] = useState<string[]>([])
  const [selectedCsvTeam, setSelectedCsvTeam] = useState('')
  const [result, setResult] = useState<{ imported?: number; missing?: number; error?: string } | null>(null)

  function handleCsvChange(text: string) {
    setCsvText(text)
    setResult(null)
    // Parsa i nomi team dal CSV client-side
    const teams = new Set<string>()
    for (const line of text.split('\n')) {
      const parts = line.split(',')
      if (parts.length < 2) continue
      const name = parts[0].trim()
      if (name && name !== '$') teams.add(name)
    }
    const list = Array.from(teams).sort()
    setCsvTeams(list)
    if (list.length === 1) setSelectedCsvTeam(list[0])
    else setSelectedCsvTeam('')
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => handleCsvChange(ev.target?.result as string ?? '')
    reader.readAsText(file)
  }

  function handleImport() {
    if (!csvText || !leagueName || !selectedCsvTeam) return
    startTransition(async () => {
      const r = await importLeague(csvText, leagueName, selectedCsvTeam)
      if ('error' in r) {
        setResult({ error: r.error })
      } else {
        setResult({ imported: r.imported, missing: r.missing })
        setShowForm(false)
        setCsvText('')
        setLeagueName('')
        setCsvTeams([])
        if (r.leagueId) {
          onSelect(r.leagueId)
          router.refresh()
        }
      }
    })
  }

  function handleDelete(leagueId: string) {
    if (!confirm('Eliminare questa lega?')) return
    startTransition(async () => {
      await deleteLeague(leagueId)
      if (selectedId === leagueId) onSelect(leagues.find(l => l.id !== leagueId)?.id ?? '')
      router.refresh()
    })
  }

  return (
    <div className="space-y-3">
      {/* Lista leghe */}
      {leagues.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {leagues.map(l => (
            <div
              key={l.id}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm cursor-pointer transition-all ${selectedId === l.id ? 'text-white border-transparent' : 'border-gray-200 hover:border-red-300'}`}
              style={selectedId === l.id ? { background: 'var(--boccea-red)' } : undefined}
              onClick={() => onSelect(l.id)}
            >
              <span className="font-medium">{l.name}</span>
              <span className="opacity-60 text-xs">{l.csv_team_name}</span>
              <button
                onClick={e => { e.stopPropagation(); handleDelete(l.id) }}
                className="ml-1 opacity-50 hover:opacity-100 text-xs"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            onClick={() => setShowForm(f => !f)}
            className="px-3 py-1.5 rounded-full border border-dashed border-gray-300 text-sm text-gray-500 hover:border-red-400 hover:text-red-600 transition-colors"
          >
            + Nuova lega
          </button>
        </div>
      )}

      {/* Form import */}
      {showForm && (
        <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
          <h3 className="text-sm font-semibold">Importa rosa da CSV</h3>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Nome lega (es. Premier SIF Elite 25/26)"
              value={leagueName}
              onChange={e => setLeagueName(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            />
            <div>
              <label className="text-xs text-gray-500 mb-1 block">File CSV roster fantacalcio.it</label>
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="block w-full text-sm"
              />
            </div>
            {csvText && !csvTeams.length && (
              <p className="text-xs text-red-500">Nessun team trovato nel CSV</p>
            )}
            {csvTeams.length > 0 && (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">La mia squadra nel CSV</label>
                <select
                  value={selectedCsvTeam}
                  onChange={e => setSelectedCsvTeam(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                >
                  <option value="">-- seleziona --</option>
                  {csvTeams.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            )}
          </div>

          {result?.error && <p className="text-xs text-red-500">{result.error}</p>}
          {result?.imported != null && (
            <p className="text-xs text-green-600">
              ✓ {result.imported} giocatori importati
              {result.missing ? ` · ${result.missing} ID non trovati nel DB (importa prima l'Excel calciatori)` : ''}
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleImport}
              disabled={isPending || !csvText || !leagueName || !selectedCsvTeam}
              className="text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
              style={{ background: 'var(--boccea-red)' }}
            >
              {isPending ? 'Importo...' : 'Importa'}
            </button>
            {leagues.length > 0 && (
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100"
              >
                Annulla
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
