'use client'
import { useState, useTransition } from 'react'
import { draftStats } from '@/lib/draft/generator'
import type { DraftResult } from '@/lib/draft/generator'
import type { Team } from '@/lib/supabase/types'
import { scheduleDraft, applyLockedDraft } from '@/lib/draft/session-actions'

type RawPlayer = { id: number; name: string; roles: string[]; fvm: number | null; serie_a_team: string | null }
type Props = { teams: Team[]; players: RawPlayer[] }

const ROLE_COLOR: Record<string, string> = {
  Por: '#f59e0b', Dc: '#3b82f6', B: '#3b82f6', Dd: '#60a5fa', Ds: '#60a5fa',
  E: '#06b6d4', M: '#10b981', C: '#10b981', T: '#8b5cf6', W: '#8b5cf6',
  A: '#ef4444', Pc: '#ef4444',
}

export function DraftSection({ teams, players }: Props) {
  const [isPending, startTransition] = useTransition()

  // Scheduling
  const [season, setSeason] = useState('2025/26 — Giornata 1')
  const [hours, setHours] = useState(24)
  const [scheduled, setScheduled] = useState<{ id: string; at: string } | null>(null)

  // Post-esecuzione
  const [applySessionId, setApplySessionId] = useState<string | null>(null)
  const [applyResult, setApplyResult] = useState<{ assigned?: number; error?: string } | null>(null)

  function handleSchedule() {
    if (!confirm(`Programmare il sorteggio "${season}" tra ${hours} ore?\nNon potrai annullarlo.`)) return
    startTransition(async () => {
      const r = await scheduleDraft(season, hours)
      if ('error' in r) { alert(r.error); return }
      setScheduled({ id: r.id, at: r.scheduled_at })
      setApplySessionId(r.id)
    })
  }

  function handleApply() {
    if (!applySessionId) return
    if (!confirm('Applicare le rose? Sovrascrive tutte le assegnazioni attuali.')) return
    startTransition(async () => {
      const r = await applyLockedDraft(applySessionId)
      setApplyResult('error' in r ? { error: r.error } : { assigned: r.assigned })
    })
  }

  function newRound() {
    setScheduled(null)
    setApplySessionId(null)
    setApplyResult(null)
    setSeason(season.replace('Giornata 1', 'Giornata 2').replace('Giornata 2', 'Giornata 3'))
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold mb-1">Assegnazione automatica rose</h2>
        <p className="text-xs text-gray-400">
          Il sorteggio viene eseguito automaticamente allo scadere del timer — nessun preview possibile.
        </p>
      </div>

      {players.length === 0 && (
        <p className="text-sm text-orange-600">⚠ Nessun giocatore — importa prima l&apos;Excel.</p>
      )}

      {/* Programmazione */}
      {!scheduled && (
        <div className="border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold">Programma nuovo sorteggio</h3>
          <div className="space-y-2">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Etichetta</label>
              <input value={season} onChange={e => setSeason(e.target.value)}
                className="border rounded px-3 py-1.5 text-sm w-full max-w-xs"
                placeholder="es. 2025/26 — Giornata 1" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Avvia tra</label>
              <div className="flex items-center gap-2">
                <input type="number" min={1} max={168} value={hours}
                  onChange={e => setHours(Number(e.target.value))}
                  className="border rounded px-3 py-1.5 text-sm w-20" />
                <span className="text-sm text-gray-500">ore</span>
                <span className="text-xs text-gray-400">
                  → {new Date(Date.now() + hours * 3600000).toLocaleString('it-IT', {
                    weekday: 'short', day: '2-digit', month: 'short',
                    hour: '2-digit', minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
          </div>
          <button onClick={handleSchedule} disabled={isPending || players.length === 0 || teams.length === 0}
            className="text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
            style={{ background: 'var(--boccea-red)' }}>
            {isPending ? 'Programmazione...' : '⏱ Programma sorteggio'}
          </button>
        </div>
      )}

      {/* Sorteggio programmato */}
      {scheduled && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
          <p className="text-blue-700 font-semibold text-sm">
            ⏱ Sorteggio programmato: <strong>{season}</strong>
          </p>
          <p className="text-xs text-blue-600">
            Si eseguirà automaticamente il{' '}
            {new Date(scheduled.at).toLocaleString('it-IT', {
              weekday: 'long', day: '2-digit', month: 'long',
              hour: '2-digit', minute: '2-digit', second: '2-digit'
            })}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <a href={`/sorteggio/${scheduled.id}`} target="_blank" rel="noreferrer"
              className="text-blue-700 underline text-xs font-medium">
              🔗 /sorteggio/{scheduled.id.slice(0, 8)}…
            </a>
            <button
              onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/sorteggio/${scheduled.id}`)}
              className="text-xs px-2 py-1 border rounded hover:bg-gray-50 bg-white">
              Copia link
            </button>
          </div>
          {!applyResult && (
            <button onClick={handleApply} disabled={isPending}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 block">
              {isPending ? 'Applico...' : '✓ Applica rose al sistema'}
            </button>
          )}
          {applyResult && (
            <p className={`text-sm font-semibold ${applyResult.error ? 'text-red-600' : 'text-green-700'}`}>
              {applyResult.error ?? `✓ ${applyResult.assigned} giocatori assegnati`}
            </p>
          )}
          {applyResult && !applyResult.error && (
            <button onClick={newRound}
              className="border border-gray-300 text-gray-600 px-4 py-1.5 rounded-lg text-sm hover:bg-gray-50">
              + Programma Giornata 2
            </button>
          )}
        </div>
      )}

      {/* Info struttura sorteggio */}
      <details className="border rounded-lg">
        <summary className="px-4 py-3 text-xs text-gray-500 cursor-pointer hover:bg-gray-50 font-medium">
          Come funziona il sorteggio ▾
        </summary>
        <div className="px-4 pb-4 pt-2 space-y-1 text-xs text-gray-500">
          <p>• <strong>Portieri</strong>: 20 squadre Serie A sorteggiate a caso, 2 per partecipante. Tutti i loro portieri.</p>
          <p>• <strong>Ogni ruolo</strong> (Dc, B, Dd, Ds, E, M, C, T, W, A, Pc): giocatori ordinati per FVM.</p>
          <p>• <strong>Gruppi da 10</strong>: il migliore del gruppo va al partecipante con FVM totale più basso in quel momento.</p>
          <p>• <strong>Casualità</strong>: l&apos;ordine dei partecipanti viene estratto a sorte per ogni ruolo.</p>
          <p>• <strong>Garanzia</strong>: il sorteggio avviene server-side allo scadere del timer, nessun preview prima del lock.</p>
        </div>
      </details>

      {/* Ultime sessioni */}
      <div className="text-xs text-gray-400 pt-2">
        <p>Per vedere le rose assegnate dopo l&apos;esecuzione: apri il link pubblico.</p>
        <p>Per applicare le rose al sistema: usa il pulsante &quot;Applica&quot; sopra dopo la conferma dell&apos;esecuzione.</p>
      </div>
    </div>
  )
}
