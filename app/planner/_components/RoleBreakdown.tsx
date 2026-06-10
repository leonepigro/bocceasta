'use client'
import { ALL_ROLES } from '@/lib/mantra/formations'
import type { PlayerNode } from '@/lib/mantra/matcher'

type Props = {
  players: PlayerNode[]
  totalMatchdays?: number // default 38
}

function presenzaColor(pv: number | null, total: number): string {
  if (pv === null) return '#9ca3af'
  const ratio = pv / total
  if (ratio >= 0.75) return '#10b981'
  if (ratio >= 0.5) return '#f59e0b'
  return '#ef4444'
}

function presenzaLabel(pv: number | null, total: number): string {
  if (pv === null) return '—'
  return `${pv}/${total}`
}

export function RoleBreakdown({ players, totalMatchdays = 38 }: Props) {
  // Per ogni ruolo: lista giocatori che lo hanno
  const byRole: Record<string, PlayerNode[]> = {}
  for (const role of ALL_ROLES) {
    byRole[role] = players.filter(p => p.roles.includes(role))
  }

  // Media presenze per ruolo
  function avgPresenze(ps: PlayerNode[]): number | null {
    const withPv = ps.filter(p => p.presenze !== null)
    if (!withPv.length) return null
    return Math.round(withPv.reduce((s, p) => s + p.presenze!, 0) / withPv.length)
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {ALL_ROLES.map(role => {
          const ps = byRole[role]
          const count = ps.length
          const avg = avgPresenze(ps)
          const danger = count <= 1

          return (
            <div
              key={role}
              className={`rounded-lg border p-2.5 ${danger && count > 0 ? 'border-orange-300 bg-orange-50' : count === 0 ? 'border-gray-100 bg-gray-50' : 'border-gray-200'}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-gray-700">{role}</span>
                <span className={`text-base font-black ${count === 0 ? 'text-gray-300' : danger ? 'text-orange-500' : 'text-gray-800'}`}>
                  {count}
                </span>
              </div>
              {count > 0 && (
                <div className="space-y-0.5">
                  {ps.map(p => (
                    <div key={p.id} className="flex items-center justify-between gap-1">
                      <span className="text-xs text-gray-600 truncate flex-1">{p.name.split(' ').slice(-1)[0]}</span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {p.presenze !== null && (
                          <div className="w-8 bg-gray-100 rounded-full h-1">
                            <div
                              className="h-1 rounded-full"
                              style={{
                                width: `${Math.min(100, (p.presenze / totalMatchdays) * 100)}%`,
                                background: presenzaColor(p.presenze, totalMatchdays),
                              }}
                            />
                          </div>
                        )}
                        <span
                          className="text-xs font-medium w-8 text-right"
                          style={{ color: presenzaColor(p.presenze, totalMatchdays) }}
                        >
                          {presenzaLabel(p.presenze, totalMatchdays)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {avg !== null && ps.length > 1 && (
                    <p className="text-xs text-gray-400 text-right pt-0.5">
                      media {avg}/{totalMatchdays}
                    </p>
                  )}
                </div>
              )}
              {count === 0 && (
                <p className="text-xs text-gray-300">nessuno</p>
              )}
              {danger && count === 1 && (
                <p className="text-xs text-orange-400 mt-0.5">⚠ 1 sola opzione</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
