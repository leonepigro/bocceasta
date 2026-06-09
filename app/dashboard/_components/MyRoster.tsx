'use client'
import { useState } from 'react'
import type { Player } from '@/lib/supabase/types'

type Props = { players: (Player & { sold_price: number })[] }

export function MyRoster({ players }: Props) {
  const [activeTab, setActiveTab] = useState<'list' | 'roles'>('list')

  const byRole = players.reduce<Record<string, typeof players>>((acc, p) => {
    const primaryRole = p.roles[0] ?? 'Altro'
    if (!acc[primaryRole]) acc[primaryRole] = []
    acc[primaryRole].push(p)
    return acc
  }, {})

  const totalSpent = players.reduce((sum, p) => sum + (p.sold_price ?? 0), 0)

  return (
    <section className="bg-white rounded-xl shadow p-4">
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-semibold">La mia rosa ({players.length})</h2>
        <span className="text-sm text-gray-500">Spesi: {totalSpent} cr</span>
      </div>

      <div className="flex gap-2 mb-3">
        {(['list', 'roles'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`text-xs px-3 py-1 rounded-full ${activeTab === tab ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            {tab === 'list' ? 'Lista' : 'Per ruolo'}
          </button>
        ))}
      </div>

      {activeTab === 'list' && (
        <ul className="space-y-1">
          {players.map(p => (
            <li key={p.id} className="flex justify-between text-sm py-1 border-b last:border-0">
              <span>
                <span className="text-xs text-blue-500 mr-1">{p.roles.join('/')}</span>
                {p.name}
              </span>
              <span className="text-gray-500">{p.sold_price} cr</span>
            </li>
          ))}
        </ul>
      )}

      {activeTab === 'roles' && (
        <div className="space-y-3">
          {Object.entries(byRole).sort().map(([role, ps]) => (
            <div key={role}>
              <p className="text-xs font-semibold text-blue-600 mb-1">{role} ({ps.length})</p>
              <ul className="space-y-0.5">
                {ps.map(p => (
                  <li key={p.id} className="flex justify-between text-sm">
                    <span>{p.name}</span>
                    <span className="text-gray-400">{p.sold_price} cr</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
