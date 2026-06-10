'use client'
import { useState, useEffect } from 'react'
import { ROLE_GROUPS } from '@/lib/mantra/formations'
import type { PlayerNode } from '@/lib/mantra/matcher'

type Props = {
  budgetRemaining: number
  rosterPlayers: PlayerNode[]
  freePlayers: PlayerNode[]
}

const STORAGE_KEY = 'bocceasta_budget_alloc'

function loadAlloc(): Record<string, number> {
  if (typeof window === 'undefined') return {}
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') } catch { return {} }
}

export function BudgetPlanner({ budgetRemaining, rosterPlayers, freePlayers }: Props) {
  const [alloc, setAlloc] = useState<Record<string, number>>({})

  useEffect(() => { setAlloc(loadAlloc()) }, [])

  function setGroup(key: string, value: number) {
    const next = { ...alloc, [key]: Math.max(0, value) }
    setAlloc(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  const totalAlloc = Object.values(alloc).reduce((s, v) => s + v, 0)
  const remaining = budgetRemaining - totalAlloc
  const overBudget = remaining < 0

  return (
    <div className="space-y-3">
      {/* Budget totale */}
      <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--boccea-red)' }}>
        <span className="text-white font-semibold text-sm">Budget disponibile</span>
        <span className="text-2xl font-black" style={{ color: 'var(--boccea-gold)' }}>
          {budgetRemaining} cr
        </span>
      </div>

      {/* Allocazione per gruppo */}
      <div className="space-y-2">
        {ROLE_GROUPS.map(group => {
          const inRoster = rosterPlayers.filter(p => p.roles.some(r => group.roles.includes(r))).length
          const inFree = freePlayers.filter(p => p.roles.some(r => group.roles.includes(r))).length
          const budget = alloc[group.key] ?? 0
          return (
            <div key={group.key} className="flex items-center gap-2">
              <div
                className="w-2 h-10 rounded-full flex-shrink-0"
                style={{ background: group.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold truncate">{group.label}</span>
                  <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                    {inRoster} rosa · {inFree} svincolati
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <input
                    type="number"
                    min={0}
                    max={500}
                    value={budget || ''}
                    placeholder="0"
                    onChange={e => setGroup(group.key, parseInt(e.target.value) || 0)}
                    className="w-16 text-xs border rounded px-1.5 py-0.5 text-right"
                  />
                  <span className="text-xs text-gray-400">cr</span>
                  {budget > 0 && (
                    <div className="flex-1 bg-gray-100 rounded-full h-1.5 ml-1">
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (budget / budgetRemaining) * 100)}%`,
                          background: group.color,
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Sommario */}
      <div className={`flex items-center justify-between p-2 rounded-lg text-sm font-semibold ${overBudget ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-700'}`}>
        <span>Residuo non allocato</span>
        <span className={overBudget ? 'text-red-600' : 'text-green-600'}>
          {remaining} cr {overBudget ? '⚠️' : ''}
        </span>
      </div>
      {overBudget && (
        <p className="text-xs text-red-500">Budget allocato supera il disponibile di {-remaining} cr</p>
      )}
    </div>
  )
}
