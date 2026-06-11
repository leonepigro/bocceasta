'use client'
import { useState, useEffect, useRef } from 'react'
import type { DraftResult, DraftPlayer } from '@/lib/draft/generator'

const ROLE_ORDER = ['Por', 'Dc', 'B', 'Dd', 'Ds', 'E', 'M', 'C', 'T', 'W', 'A', 'Pc']
const ROLE_COLOR: Record<string, string> = {
  Por: '#f59e0b', Dc: '#3b82f6', B: '#3b82f6', Dd: '#60a5fa', Ds: '#60a5fa',
  E: '#06b6d4', M: '#10b981', C: '#10b981', T: '#8b5cf6', W: '#8b5cf6',
  A: '#ef4444', Pc: '#ef4444',
}

type RevealEvent = {
  role: string
  player: DraftPlayer
  teamName: string
  teamId: string
}

function buildEvents(draft: DraftResult): RevealEvent[] {
  const events: RevealEvent[] = []
  for (const role of ROLE_ORDER) {
    // Per ogni ruolo, raccogli tutti i giocatori di quel ruolo da tutte le squadre
    // ordinati per FVM desc (come sono stati assegnati)
    const byTeam: { player: DraftPlayer; teamName: string; teamId: string }[] = []
    for (const a of draft.assignments) {
      for (const p of a.players) {
        if (p.primary_role === role) {
          byTeam.push({ player: p, teamName: a.team.team_name, teamId: a.team.id })
        }
      }
    }
    // Ordina per FVM desc per la rivelazione
    byTeam.sort((a, b) => (b.player.fvm ?? 0) - (a.player.fvm ?? 0))
    for (const e of byTeam) {
      events.push({ role, player: e.player, teamName: e.teamName, teamId: e.teamId })
    }
  }
  return events
}

export function DraftReveal({ draft }: { draft: DraftResult }) {
  const [mode, setMode] = useState<'summary' | 'live'>('summary')
  const [revealed, setRevealed] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(800)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const events = buildEvents(draft)
  const currentRole = revealed > 0 ? events[revealed - 1]?.role : null

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setRevealed(r => {
          if (r >= events.length) { setIsPlaying(false); return r }
          return r + 1
        })
      }, speed)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isPlaying, speed, events.length])

  // Riepilogo finale per squadra
  const byTeam = draft.assignments.map(a => ({
    name: a.team.team_name,
    players: a.players,
    fvmTotal: a.players.reduce((s, p) => s + (p.fvm ?? 0), 0),
    outfield: a.players.filter(p => p.primary_role !== 'Por').length,
  })).sort((a, b) => b.fvmTotal - a.fvmTotal)

  if (mode === 'summary') {
    return (
      <div className="space-y-4">
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => { setMode('live'); setRevealed(0); setIsPlaying(false) }}
            className="text-white px-6 py-3 rounded-xl font-bold text-sm"
            style={{ background: 'var(--boccea-red)' }}
          >
            ▶ Rivela in diretta
          </button>
        </div>

        <div className="space-y-2">
          {byTeam.map(t => (
            <details key={t.name} className="border rounded-lg overflow-hidden">
              <summary className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50">
                <span className="font-semibold text-sm">{t.name}</span>
                <div className="flex gap-3 text-xs text-gray-500">
                  <span>{t.players.length} gioc.</span>
                  <span className="font-bold" style={{ color: 'var(--boccea-gold)' }}>FVM {t.fvmTotal}</span>
                </div>
              </summary>
              <div className="divide-y border-t">
                {t.players
                  .sort((a, b) => ROLE_ORDER.indexOf(a.primary_role) - ROLE_ORDER.indexOf(b.primary_role) || (b.fvm ?? 0) - (a.fvm ?? 0))
                  .map(p => (
                    <div key={p.id} className="flex items-center gap-3 px-4 py-2">
                      <span className="text-white text-xs font-bold px-1.5 py-0.5 rounded w-8 text-center flex-shrink-0"
                        style={{ background: ROLE_COLOR[p.primary_role] ?? '#9ca3af' }}>
                        {p.primary_role}
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
  const visibleEvents = events.slice(0, revealed)
  const lastEvent = visibleEvents[visibleEvents.length - 1]
  const roleChanged = revealed > 0 && events[revealed]?.role !== currentRole

  return (
    <div className="space-y-4">
      {/* Controlli */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setIsPlaying(p => !p)}
          className="text-white px-4 py-2 rounded-lg font-bold text-sm"
          style={{ background: isPlaying ? '#374151' : 'var(--boccea-red)' }}
        >
          {isPlaying ? '⏸ Pausa' : revealed >= events.length ? '✓ Fine' : '▶ Avvia'}
        </button>
        <button onClick={() => setRevealed(r => Math.max(0, r - 1))} className="px-3 py-2 rounded-lg border text-sm">←</button>
        <button onClick={() => setRevealed(r => Math.min(events.length, r + 1))} className="px-3 py-2 rounded-lg border text-sm">→</button>
        <select value={speed} onChange={e => setSpeed(Number(e.target.value))} className="border rounded px-2 py-1.5 text-xs">
          <option value={1500}>Lento</option>
          <option value={800}>Normale</option>
          <option value={300}>Veloce</option>
        </select>
        <span className="text-xs text-gray-400 ml-auto">{revealed}/{events.length}</span>
        <button onClick={() => setMode('summary')} className="text-xs text-gray-400 underline">Riepilogo</button>
      </div>

      {/* Ruolo corrente */}
      {currentRole && (
        <div className={`text-center py-3 rounded-xl text-white font-black text-lg transition-all ${roleChanged ? 'scale-110' : ''}`}
          style={{ background: ROLE_COLOR[currentRole] ?? '#9ca3af' }}>
          {currentRole}
        </div>
      )}

      {/* Ultimo assegnato */}
      {lastEvent && (
        <div className="border-2 rounded-xl p-4 text-center" style={{ borderColor: ROLE_COLOR[lastEvent.role] }}>
          <p className="text-xs text-gray-400 mb-1">{lastEvent.teamName}</p>
          <p className="text-xl font-black text-gray-800">{lastEvent.player.name}</p>
          <p className="text-xs text-gray-400 mt-1">
            {lastEvent.player.serie_a_team} · FVM {lastEvent.player.fvm ?? '—'}
          </p>
        </div>
      )}

      {/* Feed eventi */}
      <div className="space-y-1 max-h-64 overflow-y-auto">
        {[...visibleEvents].reverse().map((e, i) => (
          <div key={`${e.player.id}-${i}`}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${i === 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'}`}>
            <span className="text-white text-xs font-bold px-1.5 py-0.5 rounded w-8 text-center flex-shrink-0"
              style={{ background: ROLE_COLOR[e.role] ?? '#9ca3af' }}>
              {e.role}
            </span>
            <span className="font-medium flex-1 truncate">{e.player.name}</span>
            <span className="text-gray-400 truncate text-xs">{e.teamName}</span>
            <span className="text-xs font-bold text-gray-500 flex-shrink-0">{e.player.fvm ?? '—'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
