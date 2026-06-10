'use client'
import { useState, useTransition } from 'react'
import { syncFromFantacalcio, saveFcTeamMapping, pushRostersToFantacalcio } from '@/lib/fantacalcio/actions'
import type { Team } from '@/lib/supabase/types'

type FcTeam = { id: number; nome: string; email: string | null; calciatori: number }
type Props = { teams: Team[] }

export function FantacalcioSection({ teams }: Props) {
  const [isPending, startTransition] = useTransition()
  const [fcTeams, setFcTeams] = useState<FcTeam[]>([])
  const [mapping, setMapping] = useState<Record<string, number | ''>>({})
  const [syncError, setSyncError] = useState<string | null>(null)
  const [pushResult, setPushResult] = useState<{ pushed: number; errors: string[] } | null>(null)
  const [pushError, setPushError] = useState<string | null>(null)
  const [mappingSaved, setMappingSaved] = useState(false)

  const configured = true // l'admin sa se ha configurato le env

  function handleSync() {
    setSyncError(null)
    startTransition(async () => {
      const r = await syncFromFantacalcio()
      if ('error' in r) { setSyncError(r.error ?? 'Errore'); return }
      setFcTeams(r.teams)
    })
  }

  function handleSaveMapping() {
    const mappings = Object.entries(mapping)
      .filter(([, v]) => v !== '')
      .map(([teamId, fcTeamId]) => ({ teamId, fcTeamId: Number(fcTeamId) }))
    startTransition(async () => {
      await saveFcTeamMapping(mappings)
      setMappingSaved(true)
      setTimeout(() => setMappingSaved(false), 2000)
    })
  }

  function handlePush() {
    setPushError(null)
    setPushResult(null)
    startTransition(async () => {
      const r = await pushRostersToFantacalcio()
      if ('error' in r) { setPushError(r.error ?? 'Errore'); return }
      setPushResult({ pushed: r.pushed ?? 0, errors: r.errors ?? [] })
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Sync fantacalcio.it</h2>
        <p className="text-xs text-gray-400 mb-4">
          Richiede <code className="bg-gray-100 px-1 rounded">FANTACALCIO_APP_KEY</code>,{' '}
          <code className="bg-gray-100 px-1 rounded">FANTACALCIO_USERNAME</code>,{' '}
          <code className="bg-gray-100 px-1 rounded">FANTACALCIO_PASSWORD</code> in Vercel env vars.
        </p>

        {/* Step 1: Leggi squadre da fantacalcio.it */}
        <div className="border rounded-lg p-4 mb-4">
          <h3 className="font-medium text-sm mb-2">1. Leggi squadre da fantacalcio.it</h3>
          <button onClick={handleSync} disabled={isPending}
            className="text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
            style={{ background: 'var(--boccea-red)' }}>
            {isPending ? 'Connessione...' : 'Connetti e leggi'}
          </button>
          {syncError && <p className="text-red-500 text-xs mt-2">{syncError}</p>}

          {fcTeams.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-green-600 font-medium mb-2">✓ {fcTeams.length} squadre trovate</p>
              <ul className="text-xs space-y-1 max-h-40 overflow-y-auto">
                {fcTeams.map(t => (
                  <li key={t.id} className="flex justify-between text-gray-600">
                    <span>{t.nome}</span>
                    <span className="text-gray-400">{t.email} · {t.calciatori} cal.</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Step 2: Associa squadre locali con ID fantacalcio.it */}
        {fcTeams.length > 0 && (
          <div className="border rounded-lg p-4 mb-4">
            <h3 className="font-medium text-sm mb-2">2. Associa squadre bocceasta → fantacalcio.it</h3>
            <div className="space-y-2">
              {teams.map(t => (
                <div key={t.id} className="flex items-center gap-2">
                  <span className="text-sm w-32 truncate">{t.team_name}</span>
                  <span className="text-gray-400 text-xs">→</span>
                  <select
                    value={mapping[t.id] ?? ''}
                    onChange={e => setMapping(prev => ({ ...prev, [t.id]: e.target.value === '' ? '' : Number(e.target.value) }))}
                    className="flex-1 border rounded px-2 py-1 text-sm"
                  >
                    <option value="">-- seleziona --</option>
                    {fcTeams.map(fc => (
                      <option key={fc.id} value={fc.id}>{fc.nome} ({fc.email})</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <button onClick={handleSaveMapping} disabled={isPending}
              className="mt-3 text-white px-4 py-1.5 rounded text-sm font-semibold disabled:opacity-50"
              style={{ background: 'var(--boccea-red)' }}>
              {mappingSaved ? '✓ Salvato' : 'Salva associazioni'}
            </button>
          </div>
        )}

        {/* Step 3: Push rose */}
        <div className="border rounded-lg p-4">
          <h3 className="font-medium text-sm mb-1">3. Esporta rose su fantacalcio.it</h3>
          <p className="text-xs text-gray-400 mb-3">
            Chiama <code className="bg-gray-100 px-1 rounded">buyPlayer</code> per ogni giocatore venduto nell'asta.
            Richiede step 2 completato.
          </p>
          <button onClick={handlePush} disabled={isPending}
            className="text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
            style={{ background: 'var(--boccea-red)' }}>
            {isPending ? 'Esportazione...' : 'Esporta rose su fantacalcio.it'}
          </button>
          {pushError && <p className="text-red-500 text-xs mt-2">{pushError}</p>}
          {pushResult && (
            <div className="mt-3 p-2 bg-green-50 rounded text-xs">
              <p className="text-green-700 font-medium">✓ {pushResult.pushed} giocatori esportati</p>
              {pushResult.errors.length > 0 && (
                <ul className="text-red-500 mt-1 space-y-0.5">
                  {pushResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
