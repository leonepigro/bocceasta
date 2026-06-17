'use client'
import { useState, useEffect, useRef } from 'react'
import type { DraftResult, DraftPlayer } from '@/lib/draft/generator'

const ROLE_ORDER = ['Por', 'Dc', 'B', 'Dd', 'Ds', 'E', 'M', 'C', 'T', 'W', 'A', 'Pc']
const ROLE_COLOR: Record<string, string> = {
  Por: '#f59e0b', Dc: '#3b82f6', B: '#3b82f6', Dd: '#60a5fa', Ds: '#60a5fa',
  E: '#06b6d4', M: '#10b981', C: '#10b981', T: '#8b5cf6', W: '#8b5cf6',
  A: '#ef4444', Pc: '#ef4444',
}

type RevealEvent = { player: DraftPlayer; teamName: string }
type RevealStep =
  | { type: 'single'; event: RevealEvent }
  | { type: 'batch'; events: RevealEvent[]; label: string }

function buildSteps(draft: DraftResult): RevealStep[] {
  const all: RevealEvent[] = draft.assignments.flatMap(a =>
    a.players.map(p => ({ player: p, teamName: a.team.team_name }))
  ).sort((a, b) => (b.player.fvm ?? 0) - (a.player.fvm ?? 0))

  const steps: RevealStep[] = []

  // Singoli: FVM ≥ 10 (dal più alto al più basso)
  for (const e of all.filter(e => (e.player.fvm ?? 0) >= 10)) {
    steps.push({ type: 'single', event: e })
  }

  // Batch: FVM 5-9
  const mid = all.filter(e => { const f = e.player.fvm ?? 0; return f >= 5 && f <= 9 })
  if (mid.length) steps.push({ type: 'batch', events: mid, label: 'Quotazione 5 – 9' })

  // Batch: FVM 1-4
  const low = all.filter(e => { const f = e.player.fvm ?? 0; return f >= 1 && f <= 4 })
  if (low.length) steps.push({ type: 'batch', events: low, label: 'Quotazione 1 – 4' })

  return steps
}

export function DraftReveal({ draft }: { draft: DraftResult }) {
  const [mode, setMode] = useState<'summary' | 'live'>('summary')
  const [step, setStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1000)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const steps = buildSteps(draft)
  const current = steps[step - 1] ?? null
  const done = step >= steps.length

  // Lookup conflitti per player_id
  const conflictByPlayer = new Map<number, NonNullable<DraftResult['conflicts']>[number]>()
  for (const c of draft.conflicts ?? []) conflictByPlayer.set(c.player_id, c)

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setStep(s => {
          if (s >= steps.length) { setIsPlaying(false); return s }
          return s + 1
        })
      }, speed)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isPlaying, speed, steps.length])

  // Riepilogo per squadra
  const byTeam = draft.assignments.map(a => ({
    name: a.team.team_name,
    players: a.players,
    fvmTotal: a.players.reduce((s, p) => s + (p.fvm ?? 0), 0),
  })).sort((a, b) => b.fvmTotal - a.fvmTotal)

  if (mode === 'summary') {
    const conflicts = draft.conflicts ?? []
    return (
      <div className="space-y-4">
        <div className="flex gap-2 justify-center">
          <button onClick={() => { setMode('live'); setStep(0); setIsPlaying(false) }}
            className="text-white px-6 py-3 rounded-xl font-bold text-sm"
            style={{ background: 'var(--boccea-red)' }}>
            ▶ Rivela in diretta
          </button>
        </div>

        {conflicts.length > 0 && (
          <details className="border border-orange-200 bg-orange-50 rounded-lg overflow-hidden">
            <summary className="px-4 py-3 cursor-pointer hover:bg-orange-100 font-semibold text-sm text-orange-700 flex items-center justify-between">
              <span>⚔️ Conflitti wishlist ({conflicts.length})</span>
              <span className="text-xs font-normal text-orange-600">in ordine cronologico</span>
            </summary>

            {/* Legenda */}
            <div className="px-4 py-3 bg-orange-100/60 border-t border-orange-200 text-[11px] text-orange-800 space-y-1">
              <p className="font-semibold mb-1">Come funziona la risoluzione dei conflitti</p>
              <p>Quando ≥2 squadre hanno lo stesso giocatore in wishlist, vince quella con lo <strong>score più basso</strong>.</p>
              <p><strong>Score = Quotazione rosa + Penalità</strong> — la quotazione è calcolata al momento del conflitto, prima dell'assegnazione.</p>
              <p><strong>Penalità:</strong> ogni conflitto vinto in precedenza aggiunge <strong>+50</strong> allo score nei conflitti successivi, svantaggiando chi ha già ricevuto giocatori preferiti.</p>
              <p><strong>Esclusi (sopra soglia):</strong> squadre che avevano il giocatore in wishlist ma la cui rosa superava la soglia (media + quotazione giocatore in conflitto) al momento dell'assegnazione. Non partecipano alla contesa.</p>
            </div>

            <div className="divide-y border-t border-orange-200">
              {/* Ordine cronologico: i conflitti sono già in ordine di assegnazione (FVM desc) */}
              {conflicts.map((c, idx) => (
                <div key={c.player_id} className="px-4 py-3 text-xs space-y-2">
                  {/* Header: numero progressivo + giocatore + media */}
                  <div className="flex items-center gap-2">
                    <span className="text-orange-400 font-mono w-5 flex-shrink-0">#{idx + 1}</span>
                    <span className="text-white font-bold px-1.5 py-0.5 rounded w-8 text-center flex-shrink-0"
                      style={{ background: ROLE_COLOR[c.primary_role] ?? '#9ca3af' }}>{c.primary_role}</span>
                    <span className="font-semibold">{c.player_name}</span>
                    {c.avg_quotazione != null && (
                      <span className="ml-auto text-orange-600 font-medium">media: {c.avg_quotazione}</span>
                    )}
                  </div>

                  {/* Tabella contendenti con dettaglio score */}
                  {c.contenders_detail ? (
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="text-gray-400 text-left">
                          <th className="pb-1 font-medium">Squadra</th>
                          <th className="pb-1 font-medium text-right">Quotazione</th>
                          <th className="pb-1 font-medium text-right">Penalità</th>
                          <th className="pb-1 font-medium text-right">Score</th>
                          <th className="pb-1 w-5"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {c.contenders_detail
                          .sort((a, b) => a.score - b.score)
                          .map(cd => (
                            <tr key={cd.team_name}
                              className={cd.won ? 'font-semibold text-green-700' : 'text-gray-500'}>
                              <td className="py-0.5">{cd.team_name}</td>
                              <td className="py-0.5 text-right">{cd.quotazione}</td>
                              <td className="py-0.5 text-right">
                                {cd.penalty_wins > 0
                                  ? <span className="text-orange-500">+{cd.penalty_wins * 50}</span>
                                  : '—'}
                              </td>
                              <td className="py-0.5 text-right font-mono">{cd.score}</td>
                              <td className="py-0.5 text-center">{cd.won ? '🏆' : ''}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-gray-500">
                      Conteso: {c.contenders.join(', ')} → <span className="font-bold text-green-700">{c.winner}</span>
                    </p>
                  )}

                  {/* Team esclusi per superamento media */}
                  {c.excluded_over_avg && c.excluded_over_avg.length > 0 && (
                    <p className="text-gray-400 italic">
                      Esclusi (sopra soglia): {c.excluded_over_avg
                        .map(e => `${e.team_name} (${e.quotazione})`)
                        .join(', ')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </details>
        )}

        <div className="space-y-2">
          {byTeam.map(t => (
            <details key={t.name} className="border rounded-lg overflow-hidden">
              <summary className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50">
                <span className="font-semibold text-sm">{t.name}</span>
                <div className="flex gap-3 text-xs text-gray-500">
                  <span>{t.players.length} gioc.</span>
                  <span className="font-bold" style={{ color: 'var(--boccea-gold)' }}>Quotazione {t.fvmTotal}</span>
                </div>
              </summary>
              <div className="divide-y border-t">
                {t.players
                  .sort((a, b) => ROLE_ORDER.indexOf(a.primary_role) - ROLE_ORDER.indexOf(b.primary_role) || (b.fvm ?? 0) - (a.fvm ?? 0))
                  .map(p => (
                    <div key={p.id} className="flex items-center gap-3 px-4 py-2">
                      <span className="flex gap-0.5 flex-shrink-0">
                        {p.roles.map(r => (
                          <span key={r} className="text-white text-xs font-bold px-1.5 py-0.5 rounded text-center"
                            style={{ background: ROLE_COLOR[r] ?? '#9ca3af' }}>
                            {r}
                          </span>
                        ))}
                      </span>
                      <span className="flex-1 text-sm truncate">{p.name}</span>
                      <span className="text-xs text-gray-400">{p.serie_a_team ?? '—'}</span>
                      {p.fvm != null && <span className="text-xs font-bold text-gray-500 w-8 text-right">{p.fvm}</span>}
                    </div>
                  ))}
              </div>
            </details>
          ))}
        </div>
      </div>
    )
  }

  // Modalità diretta
  return (
    <div className="space-y-4">
      {/* Controlli */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => setIsPlaying(p => !p)}
          className="text-white px-4 py-2 rounded-lg font-bold text-sm"
          style={{ background: isPlaying ? '#374151' : done ? '#6b7280' : 'var(--boccea-red)' }}>
          {done ? '✓ Fine' : isPlaying ? '⏸ Pausa' : '▶ Avvia'}
        </button>
        <button onClick={() => setStep(s => Math.max(0, s - 1))} className="px-3 py-2 rounded-lg border text-sm">←</button>
        <button onClick={() => setStep(s => Math.min(steps.length, s + 1))} className="px-3 py-2 rounded-lg border text-sm">→</button>
        <select value={speed} onChange={e => setSpeed(Number(e.target.value))} className="border rounded px-2 py-1.5 text-xs">
          <option value={2000}>Lento</option>
          <option value={1000}>Normale</option>
          <option value={400}>Veloce</option>
        </select>
        <span className="text-xs text-gray-400 ml-auto">{step}/{steps.length}</span>
        <button onClick={() => setMode('summary')} className="text-xs text-gray-400 underline">Riepilogo</button>
      </div>

      {/* Step corrente */}
      {current?.type === 'single' && (() => {
        const conflict = conflictByPlayer.get(current.event.player.id)
        return (
          <div className="border-2 rounded-xl p-5 text-center animate-pulse-once"
            style={{ borderColor: ROLE_COLOR[current.event.player.primary_role] }}>
            {conflict && (
              <p className="text-xs font-bold text-orange-600 mb-2 uppercase tracking-wide">
                ⚔️ Conteso tra {conflict.contenders.join(', ')}
              </p>
            )}
            <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide">
              {conflict ? `Vince → ${current.event.teamName}` : current.event.teamName}
            </p>
            {conflict?.contenders_detail && (() => {
              const winner = conflict.contenders_detail.find(cd => cd.won)
              if (!winner) return null
              return (
                <p className="text-[11px] text-orange-500 mb-1">
                  Rosa {winner.quotazione}
                  {winner.penalty_wins > 0 && <> · +{winner.penalty_wins * 50} penalità</>}
                  {' '}· score {winner.score}
                  {conflict.avg_quotazione != null && <> · media {conflict.avg_quotazione}</>}
                </p>
              )
            })()}
            <p className="text-3xl font-black text-gray-800 leading-tight">{current.event.player.name}</p>
            <p className="text-sm text-gray-400 mt-2 flex items-center justify-center gap-1 flex-wrap">
              <span className="flex gap-0.5 mr-1">
                {current.event.player.roles.map(r => (
                  <span key={r} className="text-white font-bold px-2 py-0.5 rounded"
                    style={{ background: ROLE_COLOR[r] ?? '#9ca3af' }}>
                    {r}
                  </span>
                ))}
              </span>
              {current.event.player.serie_a_team} · Quotazione {current.event.player.fvm ?? '—'}
            </p>
          </div>
        )
      })()}

      {current?.type === 'batch' && (
        <div className="border-2 border-gray-300 rounded-xl p-4">
          <p className="text-sm font-bold text-gray-600 mb-3 text-center">{current.label}</p>
          <div className="grid grid-cols-2 gap-1 max-h-80 overflow-y-auto">
            {current.events.map(e => (
              <div key={e.player.id} className="flex items-center gap-1.5 bg-gray-50 rounded px-2 py-1.5">
                <span className="flex gap-0.5 flex-shrink-0">
                  {e.player.roles.map(r => (
                    <span key={r} className="text-white text-[10px] font-bold px-1 py-0.5 rounded"
                      style={{ background: ROLE_COLOR[r] ?? '#9ca3af' }}>
                      {r}
                    </span>
                  ))}
                </span>
                <span className="text-xs font-medium truncate flex-1">{e.player.name}</span>
                <span className="text-[10px] text-gray-400 flex-shrink-0">{e.player.fvm}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!current && step === 0 && (
        <div className="text-center py-12 text-gray-400 text-sm">Premi ▶ per iniziare</div>
      )}

      {/* Feed singoli già rivelati */}
      {step > 0 && (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {steps.slice(0, step).reverse().map((s, i) => {
            if (s.type !== 'single') return null
            return (
              <div key={`${s.event.player.id}-${i}`}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${i === 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'}`}>
                <span className="flex gap-0.5 flex-shrink-0">
                  {s.event.player.roles.map(r => (
                    <span key={r} className="text-white text-xs font-bold px-1.5 py-0.5 rounded"
                      style={{ background: ROLE_COLOR[r] ?? '#9ca3af' }}>
                      {r}
                    </span>
                  ))}
                </span>
                <span className="font-medium flex-1 truncate">{s.event.player.name}</span>
                <span className="text-gray-400 truncate text-xs">{s.event.teamName}</span>
                <span className="text-xs font-bold text-gray-500 flex-shrink-0">{s.event.player.fvm ?? '—'}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
