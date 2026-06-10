'use client'
import { useMemo, useState } from 'react'
import { analyzeFormations, suggestForMissing } from '@/lib/mantra/matcher'
import { FORMATIONS } from '@/lib/mantra/formations'
import type { PlayerNode } from '@/lib/mantra/matcher'

type Props = {
  rosterPlayers: PlayerNode[]
  freePlayers: PlayerNode[]
}

export function FormationAnalysis({ rosterPlayers, freePlayers }: Props) {
  const [selected, setSelected] = useState<string | null>(null)

  const results = useMemo(
    () => analyzeFormations(rosterPlayers, FORMATIONS),
    [rosterPlayers]
  )

  const best = results[0]
  const selectedResult = selected ? results.find(r => r.formation.name === selected) ?? best : best

  const suggestions = useMemo(
    () => suggestForMissing(selectedResult.missingSlots, freePlayers),
    [selectedResult, freePlayers]
  )

  return (
    <div className="space-y-4">
      {/* Griglia moduli */}
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
        {results.map(r => {
          const pct = (r.filled / 11) * 100
          const color = pct === 100 ? '#10b981' : pct >= 82 ? '#f59e0b' : '#ef4444'
          const isSelected = (selected ?? best.formation.name) === r.formation.name
          return (
            <button
              key={r.formation.name}
              onClick={() => setSelected(r.formation.name)}
              className={`rounded-lg p-2 text-left border transition-all ${isSelected ? '' : 'hover:bg-gray-50'}`}
              style={{ borderColor: isSelected ? color : '#e5e7eb', outline: isSelected ? `2px solid ${color}` : 'none' }}
            >
              <p className="text-xs font-bold">{r.formation.name}</p>
              <p className="text-lg font-black leading-tight" style={{ color }}>
                {r.filled}/11
              </p>
              <div className="w-full bg-gray-100 rounded-full h-1 mt-1">
                <div className="h-1 rounded-full" style={{ width: `${pct}%`, background: color }} />
              </div>
            </button>
          )
        })}
      </div>

      {/* Dettaglio modulo selezionato */}
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{selectedResult.formation.name}</h3>
          <span className="text-sm text-gray-500">
            {selectedResult.filled}/11 slot coperti
          </span>
        </div>

        {/* Slot */}
        <div className="flex flex-wrap gap-1.5">
          {selectedResult.formation.slots.map((slot, i) => {
            const filled = selectedResult.slotToPlayer[i] !== null
            const player = filled ? rosterPlayers[selectedResult.slotToPlayer[i]!] : null
            return (
              <div
                key={i}
                className={`text-xs px-2 py-1 rounded-full font-medium ${filled ? 'text-white' : 'bg-red-50 text-red-600 border border-red-200'}`}
                style={filled ? { background: 'var(--boccea-red)' } : undefined}
                title={player?.name}
              >
                {slot.label}
                {player && <span className="opacity-75 ml-1 truncate max-w-[60px] inline-block align-middle">{player.name.split(' ').pop()}</span>}
              </div>
            )
          })}
        </div>

        {/* Suggerimenti per slot mancanti */}
        {suggestions.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-xs font-semibold text-red-600">Slot scoperti — suggerimenti svincolati:</p>
            {suggestions.map(({ slot, suggestions: sugg }) => (
              <div key={slot.label} className="text-xs">
                <span className="font-medium bg-red-100 text-red-700 px-1.5 py-0.5 rounded mr-2">
                  {slot.label}
                </span>
                {sugg.length === 0 ? (
                  <span className="text-gray-400">Nessuno disponibile</span>
                ) : (
                  sugg.map(p => (
                    <span key={p.id} className="mr-3 text-gray-700">
                      {p.name}
                      <span className="text-gray-400 ml-1">FVM {p.fvm ?? '—'}</span>
                    </span>
                  ))
                )}
              </div>
            ))}
          </div>
        )}

        {selectedResult.filled === 11 && (
          <p className="text-xs text-green-600 font-semibold">✓ Modulo completamente coperto dalla rosa</p>
        )}
      </div>
    </div>
  )
}
