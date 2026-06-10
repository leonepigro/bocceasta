'use client'
import { ALL_ROLES } from '@/lib/mantra/formations'
import type { PlayerNode } from '@/lib/mantra/matcher'

type Props = {
  players: PlayerNode[]
}

export function RoleBreakdown({ players }: Props) {
  const byRole: Record<string, PlayerNode[]> = {}
  for (const role of ALL_ROLES) {
    byRole[role] = players
      .filter(p => p.roles.includes(role))
      .sort((a, b) => (b.fvm ?? 0) - (a.fvm ?? 0))
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {ALL_ROLES.map(role => {
        const ps = byRole[role]
        const count = ps.length
        const danger = count === 1

        return (
          <div
            key={role}
            className={`rounded-lg border p-2.5 ${danger ? 'border-orange-300 bg-orange-50' : count === 0 ? 'border-gray-100 bg-gray-50' : 'border-gray-200'}`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-gray-700">{role}</span>
              <span className={`text-base font-black ${count === 0 ? 'text-gray-300' : danger ? 'text-orange-500' : 'text-gray-800'}`}>
                {count}
              </span>
            </div>
            {count > 0 ? (
              <div className="space-y-0.5">
                {ps.map(p => (
                  <div key={p.id} className="flex items-center justify-between gap-1">
                    <span className="text-xs text-gray-600 truncate flex-1">{p.name}</span>
                    {p.fvm != null && (
                      <span className="text-xs font-semibold text-gray-500 flex-shrink-0">{p.fvm}</span>
                    )}
                  </div>
                ))}
                {danger && (
                  <p className="text-xs text-orange-400 mt-1">⚠ 1 sola opzione</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-300">nessuno</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
