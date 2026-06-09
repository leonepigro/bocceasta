'use client'
import { useState, useMemo } from 'react'

type PlayerRow = {
  id: number
  name: string
  roles: string[]
  serie_a_team: string | null
  fvm: number | null
  is_sold: boolean
  sold_price: number | null
  owner_team_name: string | null
  in_active_auction: boolean
  auction_price: number | null
  auction_winner_team: string | null
}

type Props = { players: PlayerRow[]; enabledRoles: string[] }

export function PlayersList({ players, enabledRoles }: Props) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'free' | 'sold' | 'auction'>('all')
  const [roleFilter, setRoleFilter] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return players.filter(p => {
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.serie_a_team?.toLowerCase().includes(search.toLowerCase()) ||
        p.roles.some(r => r.toLowerCase().includes(search.toLowerCase()))
      const matchFilter =
        filter === 'all' ? true :
        filter === 'free' ? !p.is_sold && !p.in_active_auction :
        filter === 'sold' ? p.is_sold :
        filter === 'auction' ? p.in_active_auction : true
      const matchRole = !roleFilter || p.roles.includes(roleFilter)
      return matchSearch && matchFilter && matchRole
    })
  }, [players, search, filter, roleFilter])

  const counts = useMemo(() => ({
    free: players.filter(p => !p.is_sold && !p.in_active_auction).length,
    auction: players.filter(p => p.in_active_auction).length,
    sold: players.filter(p => p.is_sold).length,
  }), [players])

  return (
    <section className="bg-white rounded-xl shadow-sm p-4">
      <h2 className="font-semibold mb-3">Calciatori ({players.length})</h2>

      <div className="flex gap-1 mb-3 flex-wrap">
        {([
          ['all', `Tutti (${players.length})`],
          ['free', `Svincolati (${counts.free})`],
          ['auction', `In asta (${counts.auction})`],
          ['sold', `Acquistati (${counts.sold})`],
        ] as const).map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            className="text-xs px-3 py-1 rounded-full border transition-colors"
            style={filter === val ? { background: 'var(--boccea-red)', color: 'white', borderColor: 'var(--boccea-red)' } : { background: 'white', color: '#555', borderColor: '#ddd' }}
          >
            {label}
          </button>
        ))}
      </div>

      {enabledRoles.length > 0 && (
        <div className="flex gap-1 mb-3 flex-wrap">
          <button
            onClick={() => setRoleFilter(null)}
            className="text-xs px-3 py-1 rounded-full border transition-colors"
            style={!roleFilter ? { background: 'var(--boccea-gold)', color: '#7a4f00', borderColor: 'var(--boccea-gold)' } : { background: 'white', color: '#555', borderColor: '#ddd' }}
          >
            Tutti i ruoli
          </button>
          {enabledRoles.map(role => (
            <button
              key={role}
              onClick={() => setRoleFilter(roleFilter === role ? null : role)}
              className="text-xs px-3 py-1 rounded-full border transition-colors font-mono"
              style={roleFilter === role ? { background: 'var(--boccea-gold)', color: '#7a4f00', borderColor: 'var(--boccea-gold)' } : { background: 'white', color: '#555', borderColor: '#ddd' }}
            >
              {role}
            </button>
          ))}
        </div>
      )}

      <input
        type="text"
        placeholder="Cerca per nome, squadra, ruolo..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-1"
        style={{ '--tw-ring-color': 'var(--boccea-red)' } as React.CSSProperties}
      />

      {filtered.length === 0 ? (
        <p className="text-center text-gray-400 py-4 text-sm">Nessun risultato</p>
      ) : (
        <ul className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
          {filtered.map(p => (
            <li key={p.id} className="py-2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="font-medium text-sm">{p.name}</span>
                <span className="text-xs text-gray-400 ml-1">{p.serie_a_team}</span>
                <div className="text-xs text-gray-400 mt-0.5">
                  <span className="font-mono">{p.roles.join('/')}</span>
                  {p.fvm ? <span className="ml-2">FVM {p.fvm}</span> : null}
                </div>
              </div>
              <div className="shrink-0 text-right">
                {p.is_sold ? (
                  <div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {p.owner_team_name ?? '—'}
                    </span>
                    <div className="text-xs text-gray-400 mt-0.5">{p.sold_price} cr</div>
                  </div>
                ) : p.in_active_auction ? (
                  <div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-amber-800" style={{ background: 'var(--boccea-gold-light)' }}>
                      In asta
                    </span>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {p.auction_price} cr {p.auction_winner_team ? `· ${p.auction_winner_team}` : ''}
                    </div>
                  </div>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-medium">
                    Libero
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
