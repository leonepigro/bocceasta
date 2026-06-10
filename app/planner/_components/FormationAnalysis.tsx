'use client'
import { useMemo, useState } from 'react'
import { analyzeFormations, suggestForMissing } from '@/lib/mantra/matcher'
import { FORMATIONS } from '@/lib/mantra/formations'
import type { PlayerNode } from '@/lib/mantra/matcher'

type Props = {
  rosterPlayers: PlayerNode[]
  freePlayers: PlayerNode[]
}

const ROLE_COLOR: Record<string, string> = {
  Por: '#f59e0b',
  Dc: '#3b82f6', B: '#3b82f6',
  Dd: '#60a5fa', Ds: '#60a5fa',
  E: '#06b6d4',
  M: '#10b981', C: '#10b981',
  T: '#8b5cf6', W: '#8b5cf6',
  A: '#ef4444', Pc: '#ef4444',
}

function roleColor(roles: string[]): string {
  return ROLE_COLOR[roles[0]] ?? '#9ca3af'
}


export function FormationAnalysis({ rosterPlayers, freePlayers }: Props) {
  const [selected, setSelected] = useState<string | null>(null)

  const results = useMemo(
    () => analyzeFormations(rosterPlayers, FORMATIONS),
    [rosterPlayers]
  )

  const best = results[0]
  const selectedResult = results.find(r => r.formation.name === (selected ?? best.formation.name)) ?? best

  const suggestions = useMemo(
    () => suggestForMissing(selectedResult.missingSlots, freePlayers),
    [selectedResult, freePlayers]
  )

  return (
    <div className="space-y-4">
      {/* Selezione modulo — griglia compatta */}
      <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
        {results.map(r => {
          const pct = (r.filled / 11) * 100
          const color = pct === 100 ? '#10b981' : pct >= 82 ? '#f59e0b' : '#ef4444'
          const isSelected = (selected ?? best.formation.name) === r.formation.name
          return (
            <button
              key={r.formation.name}
              onClick={() => setSelected(r.formation.name)}
              className="rounded-lg p-2 text-left border transition-all hover:bg-gray-50"
              style={{
                borderColor: isSelected ? color : '#e5e7eb',
                outline: isSelected ? `2px solid ${color}` : 'none',
                outlineOffset: '1px',
              }}
            >
              <p className="text-[11px] font-bold text-gray-700 leading-tight">{r.formation.name}</p>
              <p className="text-sm font-black leading-tight mt-0.5" style={{ color }}>
                {r.filled}/11
              </p>
            </button>
          )
        })}
      </div>

      {/* Dettaglio modulo selezionato */}
      <div className="border rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ background: 'var(--boccea-red)' }}>
          <span className="text-white font-bold text-base">{selectedResult.formation.name}</span>
          <span className="text-white/80 text-sm font-medium">
            {selectedResult.filled}/11 slot coperti
          </span>
        </div>

        {/* Slot list */}
        <div className="divide-y">
          {selectedResult.formation.slots.map((slot, i) => {
            const playerIdx = selectedResult.slotToPlayer[i]
            const player = playerIdx !== null ? rosterPlayers[playerIdx] : null
            const color = roleColor(slot.roles)

            return (
              <div
                key={i}
                className={`flex items-center gap-3 px-4 py-2.5 ${!player ? 'bg-red-50' : ''}`}
              >
                {/* Role badge */}
                <span
                  className="text-white text-xs font-bold px-2 py-0.5 rounded w-14 text-center flex-shrink-0"
                  style={{ background: player ? color : '#ef4444' }}
                >
                  {slot.label}
                </span>

                {/* Player name */}
                <div className="flex-1 min-w-0">
                  {player ? (
                    <p className="text-sm font-semibold text-gray-800 truncate">{player.name}</p>
                  ) : (
                    <p className="text-sm text-red-400 italic">slot scoperto</p>
                  )}
                </div>

                {/* FVM */}
                {player && player.fvm != null && (
                  <span className="flex-shrink-0 text-sm font-bold text-gray-400">
                    {player.fvm}
                  </span>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-gray-50 border-t">
          {selectedResult.filled === 11 ? (
            <p className="text-xs text-green-600 font-semibold">✓ Modulo completamente coperto dalla rosa</p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-red-600">Slot scoperti — migliori svincolati disponibili:</p>
              {suggestions.map(({ slot, suggestions: sugg }) => (
                <div key={slot.label} className="text-xs flex items-start gap-2">
                  <span
                    className="text-white font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                    style={{ background: roleColor(slot.roles) }}
                  >
                    {slot.label}
                  </span>
                  {sugg.length === 0 ? (
                    <span className="text-gray-400 italic">nessuno disponibile</span>
                  ) : (
                    <span className="text-gray-700">
                      {sugg.map((p, j) => (
                        <span key={p.id}>
                          {p.name}
                          <span className="text-gray-400 ml-0.5">
                            FVM {p.fvm ?? '—'}
                            </span>
                          {j < sugg.length - 1 && <span className="text-gray-300 mx-1">·</span>}
                        </span>
                      ))}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
