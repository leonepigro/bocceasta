'use client'
import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { launchAuction } from '@/lib/auction/actions'
import type { Team } from '@/lib/supabase/types'

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

type Props = {
  players: PlayerRow[]
  enabledRoles: string[]
  currentTeam: Team
}

function LaunchInline({ player, budget, onDone }: { player: PlayerRow; budget: number; onDone: () => void }) {
  const [bid, setBid] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await launchAuction(player.id, bid)
      if (result.error) setError(result.error)
      else { onDone(); router.refresh() }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-1 items-center mt-1" onClick={e => e.stopPropagation()}>
      <input
        type="number"
        min={1}
        max={budget}
        value={bid}
        onChange={e => setBid(parseInt(e.target.value) || 1)}
        className="w-16 border border-gray-200 rounded px-2 py-1 text-xs"
        placeholder="cr"
        autoFocus
      />
      <button type="submit" disabled={isPending}
        className="text-white px-2 py-1 rounded text-xs font-semibold disabled:opacity-50"
        style={{ background: 'var(--boccea-red)' }}>
        {isPending ? '...' : 'Lancia'}
      </button>
      <button type="button" onClick={onDone} className="text-gray-400 text-xs px-1">✕</button>
      {error && <span className="text-red-500 text-xs">{error}</span>}
    </form>
  )
}

export function PlayersList({ players, enabledRoles, currentTeam }: Props) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'free' | 'sold' | 'auction'>('all')
  const [roleFilter, setRoleFilter] = useState<string | null>(null)
  const [launchingId, setLaunchingId] = useState<number | null>(null)

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

  function canLaunch(p: PlayerRow) {
    return !p.is_sold && !p.in_active_auction &&
      enabledRoles.length > 0 &&
      p.roles.some(r => enabledRoles.includes(r))
  }

  return (
    <section className="bg-white rounded-xl shadow-sm p-4">
      <h2 className="font-semibold mb-3">Calciatori ({players.length})</h2>

      <div className="flex gap-1 mb-2 flex-wrap">
        {([
          ['all', `Tutti (${players.length})`],
          ['free', `Svincolati (${counts.free})`],
          ['auction', `In asta (${counts.auction})`],
          ['sold', `Acquistati (${counts.sold})`],
        ] as const).map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            className="text-xs px-3 py-1 rounded-full border transition-colors"
            style={filter === val ? { background: 'var(--boccea-red)', color: 'white', borderColor: 'var(--boccea-red)' } : { background: 'white', color: '#555', borderColor: '#ddd' }}>
            {label}
          </button>
        ))}
      </div>

      {enabledRoles.length > 0 && (
        <div className="flex gap-1 mb-2 flex-wrap">
          <button onClick={() => setRoleFilter(null)}
            className="text-xs px-3 py-1 rounded-full border transition-colors"
            style={!roleFilter ? { background: 'var(--boccea-gold)', color: '#7a4f00', borderColor: 'var(--boccea-gold)' } : { background: 'white', color: '#555', borderColor: '#ddd' }}>
            Tutti i ruoli
          </button>
          {enabledRoles.map(role => (
            <button key={role} onClick={() => setRoleFilter(roleFilter === role ? null : role)}
              className="text-xs px-3 py-1 rounded-full border transition-colors font-mono"
              style={roleFilter === role ? { background: 'var(--boccea-gold)', color: '#7a4f00', borderColor: 'var(--boccea-gold)' } : { background: 'white', color: '#555', borderColor: '#ddd' }}>
              {role}
            </button>
          ))}
        </div>
      )}

      <input type="text" placeholder="Cerca per nome, squadra, ruolo..."
        value={search} onChange={e => setSearch(e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-1" />

      {filtered.length === 0 ? (
        <p className="text-center text-gray-400 py-4 text-sm">Nessun risultato</p>
      ) : (
        <ul className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
          {filtered.map(p => (
            <li key={p.id} className="py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-medium text-sm">{p.name}</span>
                  <span className="text-xs text-gray-400 ml-1">{p.serie_a_team}</span>
                  <div className="text-xs text-gray-400 mt-0.5">
                    <span className="font-mono">{p.roles.join('/')}</span>
                    {p.fvm ? <span className="ml-2">FVM {p.fvm}</span> : null}
                  </div>
                </div>
                <div className="shrink-0 text-right flex items-center gap-2">
                  {p.is_sold ? (
                    <div className="text-right">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-semibold">
                        {p.owner_team_name ?? '—'}
                      </span>
                      <div className="text-xs text-gray-400 mt-0.5">{p.sold_price} cr</div>
                    </div>
                  ) : p.in_active_auction ? (
                    <div className="text-right">
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold text-amber-800"
                        style={{ background: 'var(--boccea-gold-light)' }}>
                        In asta
                      </span>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {p.auction_price} cr{p.auction_winner_team ? ` · ${p.auction_winner_team}` : ''}
                      </div>
                    </div>
                  ) : canLaunch(p) ? (
                    launchingId === p.id ? null : (
                      <button
                        onClick={() => setLaunchingId(p.id)}
                        className="text-xs px-2 py-1 rounded border font-medium"
                        style={{ borderColor: 'var(--boccea-red)', color: 'var(--boccea-red)' }}
                      >
                        Lancia
                      </button>
                    )
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-medium">
                      Libero
                    </span>
                  )}
                </div>
              </div>
              {launchingId === p.id && (
                <LaunchInline
                  player={p}
                  budget={currentTeam.budget_remaining}
                  onDone={() => setLaunchingId(null)}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
