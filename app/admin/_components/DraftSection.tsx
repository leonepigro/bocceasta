'use client'
import { useState, useTransition } from 'react'
import { draftStats } from '@/lib/draft/generator'
import type { DraftResult, DraftTeamAssignment } from '@/lib/draft/generator'
import type { Team } from '@/lib/supabase/types'
import { scheduleDraft, startApplyDraft, applyDraftBatch, finalizeDraftApply } from '@/lib/draft/session-actions'

type RawPlayer = { id: number; name: string; roles: string[]; fvm: number | null; serie_a_team: string | null }
type ActiveDraft = { id: string; season: string; scheduled_at: string | null; locked_at: string | null; applied_at: string | null; result: unknown } | null
type Props = { teams: Team[]; players: RawPlayer[]; activeDraft: ActiveDraft }

const ROLE_COLOR: Record<string, string> = {
  Por: '#f59e0b', Dc: '#3b82f6', B: '#3b82f6', Dd: '#60a5fa', Ds: '#60a5fa',
  E: '#06b6d4', M: '#10b981', C: '#10b981', T: '#8b5cf6', W: '#8b5cf6',
  A: '#ef4444', Pc: '#ef4444',
}

export function DraftSection({ teams, players, activeDraft }: Props) {
  const [isPending, startTransition] = useTransition()

  // Scheduling
  const [season, setSeason] = useState('2026/27 — Giornata ##')
  const [hours, setHours] = useState(24)
  const [scheduled, setScheduled] = useState<{ id: string; at: string } | null>(
    activeDraft && !activeDraft.applied_at
      ? { id: activeDraft.id, at: activeDraft.scheduled_at ?? '' }
      : null
  )

  // Post-esecuzione
  const [applySessionId, setApplySessionId] = useState<string | null>(activeDraft?.id ?? null)
  const [applyResult, setApplyResult] = useState<{ assigned?: number; error?: string } | null>(null)
  const [applyProgress, setApplyProgress] = useState<{ done: number; total: number } | null>(null)

  const isBlocked = !!scheduled  // bloccato se c'è una sessione attiva

  function handleSchedule() {
    if (!confirm(`Programmare il sorteggio "${season}" tra ${hours} ore?\nNon potrai annullarlo.`)) return
    startTransition(async () => {
      const r = await scheduleDraft(season, hours)
      if ('error' in r) { alert(r.error); return }
      setScheduled({ id: r.id, at: r.scheduled_at })
      setApplySessionId(r.id)
    })
  }

  async function handleApply() {
    if (!applySessionId || !activeDraft?.result) return
    if (!confirm('Applicare le rose? Sovrascrive tutte le assegnazioni attuali.')) return

    setApplyProgress(null)
    setApplyResult(null)

    // 1. Reset + ottieni totale
    const start = await startApplyDraft(applySessionId)
    if ('error' in start) { setApplyResult({ error: start.error }); return }
    const total = start.total ?? 0

    // 2. Prepara tutti gli assignment
    const draft = activeDraft.result as DraftResult
    const all = draft.assignments.flatMap(a =>
      a.players.map(p => ({ playerId: p.id, teamId: a.team.id, fvm: p.fvm }))
    )

    // 3. Apply a batch da 30
    const BATCH = 30
    let done = 0
    setApplyProgress({ done: 0, total })

    for (let i = 0; i < all.length; i += BATCH) {
      const batch = all.slice(i, i + BATCH)
      await applyDraftBatch(applySessionId, batch)
      done += batch.length
      setApplyProgress({ done, total })
    }

    // 4. Finalizza
    await finalizeDraftApply(applySessionId)
    setApplyProgress(null)
    setApplyResult({ assigned: done })
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
      {!isBlocked && (
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

      {/* Sorteggio in corso o programmato */}
      {isBlocked && scheduled && (
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
          {!applyResult && !applyProgress && (
            <button onClick={handleApply} disabled={isPending}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 block">
              ✓ Applica rose al sistema
            </button>
          )}
          {applyProgress && (
            <div className="space-y-1">
              <p className="text-xs text-blue-700 font-medium">
                Assegnazione in corso… {applyProgress.done}/{applyProgress.total} giocatori
              </p>
              <div className="w-full bg-blue-100 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${Math.round((applyProgress.done / applyProgress.total) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-blue-500">
                {Math.round((applyProgress.done / applyProgress.total) * 100)}%
              </p>
            </div>
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

      {/* Riepilogo bilanciamento — visibile dopo esecuzione */}
      {isBlocked && !!activeDraft?.result && <DraftSummaryTable draft={activeDraft!.result as DraftResult} sessionId={activeDraft!.id} />}

      {/* Info struttura sorteggio */}
      <details className="border rounded-lg">
        <summary className="px-4 py-3 text-xs text-gray-500 cursor-pointer hover:bg-gray-50 font-medium">
          Come funziona il sorteggio ▾
        </summary>
        <div className="px-4 pb-4 pt-2 space-y-1 text-xs text-gray-500">
          <p>• <strong>Tutti i ruoli (portieri inclusi)</strong>: giocatori distribuiti per Quotazione.</p>
          <p>• <strong>Ogni giocatore</strong>: va al partecipante con Quotazione totale più bassa che ha ancora slot per quel ruolo.</p>
          <p>• <strong>Best-of-100</strong>: lancio 100 sorteggi candidati, prendo quello con range Quotazione totale più stretto.</p>
          <p>• <strong>Casualità</strong>: piccolo rumore nel tie-breaking + 100 run indipendenti.</p>
          <p>• <strong>Garanzia</strong>: il sorteggio avviene server-side allo scadere del timer, nessun preview prima del lock.</p>
        </div>
      </details>

      <div className="text-xs text-gray-400 pt-2 flex items-center justify-between">
        <p>Per applicare le rose: usa il pulsante &quot;Applica&quot; dopo l&apos;esecuzione.</p>
        <a href="/admin/sorteggi" className="text-blue-500 underline flex-shrink-0 ml-4">Storico sorteggi →</a>
      </div>
    </div>
  )
}

function DraftSummaryTable({ draft, sessionId }: { draft: DraftResult; sessionId: string }) {
  const [sel, setSel] = useState<string | null>(null)
  const viewA = draft.assignments.find(a => a.team.id === sel)

  return (
    <div className="space-y-2">
      <div className="border rounded-lg overflow-hidden">
        <div className="px-4 py-2 bg-gray-50 border-b flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-600">Riepilogo bilanciamento</p>
          <a href={`/sorteggio/${sessionId}`} target="_blank" rel="noreferrer"
            className="text-xs text-blue-600 underline">Pagina pubblica →</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-3 py-2 font-medium">Squadra</th>
                <th className="text-right px-2 py-2">Por</th>
                <th className="text-right px-2 py-2">Mov</th>
                <th className="text-right px-2 py-2 text-yellow-600">Quotaz.</th>
                <th className="text-right px-2 py-2 text-blue-500">Dif</th>
                <th className="text-right px-2 py-2 text-green-600">Mid</th>
                <th className="text-right px-2 py-2 text-purple-500">T/W</th>
                <th className="text-right px-2 py-2 text-red-500">Att</th>
              </tr>
            </thead>
            <tbody>
              {draft.assignments.map((a: DraftTeamAssignment) => {
                const s = draftStats(a)
                return (
                  <tr key={a.team.id}
                    className={`border-b cursor-pointer hover:bg-gray-50 ${sel === a.team.id ? 'bg-blue-50' : ''}`}
                    onClick={() => setSel(sel === a.team.id ? null : a.team.id)}>
                    <td className="px-3 py-1.5 font-medium truncate max-w-[120px]">{a.team.team_name}</td>
                    <td className="text-right px-2 py-1.5">{s.byRole['Por'] ?? 0}</td>
                    <td className="text-right px-2 py-1.5 font-bold">{s.outfieldCount}</td>
                    <td className="text-right px-2 py-1.5 text-yellow-600 font-semibold">{s.fvmTotal}</td>
                    <td className="text-right px-2 py-1.5">{(s.byRole['Dc'] ?? 0) + (s.byRole['B'] ?? 0) + (s.byRole['Dd'] ?? 0) + (s.byRole['Ds'] ?? 0)}</td>
                    <td className="text-right px-2 py-1.5">{(s.byRole['E'] ?? 0) + (s.byRole['M'] ?? 0) + (s.byRole['C'] ?? 0)}</td>
                    <td className="text-right px-2 py-1.5">{(s.byRole['T'] ?? 0) + (s.byRole['W'] ?? 0)}</td>
                    <td className="text-right px-2 py-1.5">{(s.byRole['A'] ?? 0) + (s.byRole['Pc'] ?? 0)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      {viewA && (
        <div className="border rounded-lg overflow-hidden">
          <div className="px-4 py-2 text-white text-sm font-bold" style={{ background: 'var(--boccea-red)' }}>
            {viewA.team.team_name} — Por: {viewA.gk_serie_a_teams.join(', ') || '—'}
          </div>
          <div className="divide-y max-h-64 overflow-y-auto">
            {viewA.players
              .sort((a, b) => ['Por','Dc','B','Dd','Ds','E','M','C','T','W','A','Pc'].indexOf(a.primary_role) - ['Por','Dc','B','Dd','Ds','E','M','C','T','W','A','Pc'].indexOf(b.primary_role) || (b.fvm ?? 0) - (a.fvm ?? 0))
              .map(p => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-1.5">
                  <span className="text-white text-xs font-bold px-1.5 py-0.5 rounded w-8 text-center flex-shrink-0"
                    style={{ background: ROLE_COLOR[p.primary_role] ?? '#9ca3af' }}>{p.primary_role}</span>
                  <span className="flex-1 text-sm truncate">{p.name}</span>
                  <span className="text-xs text-gray-400">{p.serie_a_team ?? '—'}</span>
                  {p.fvm != null && <span className="text-sm font-bold text-gray-500 w-8 text-right">{p.fvm}</span>}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
