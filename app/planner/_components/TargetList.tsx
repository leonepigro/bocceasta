'use client'
import { useState, useTransition, useMemo } from 'react'
import { addTarget, removeTarget, updateTargetPrice } from '@/lib/mantra/actions'
import { ALL_ROLES } from '@/lib/mantra/formations'

type PlayerRow = {
  id: number
  name: string
  serie_a_team: string | null
  roles: string[]
  fvm: number | null
  is_sold: boolean
  in_active_auction: boolean
}

type Target = {
  player_id: number
  max_price: number
}

type Props = {
  allPlayers: PlayerRow[]
  initialTargets: Target[]
  budget: number
}

export function TargetList({ allPlayers, initialTargets, budget }: Props) {
  const [targets, setTargets] = useState<Map<number, number>>(
    () => new Map(initialTargets.map(t => [t.player_id, t.max_price]))
  )
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [isPending, startTransition] = useTransition()
  const [tab, setTab] = useState<'targets' | 'search'>('targets')

  const ROLES = ALL_ROLES

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return allPlayers
      .filter(p => !p.is_sold)
      .filter(p => !roleFilter || p.roles.includes(roleFilter))
      .filter(p => !q || p.name.toLowerCase().includes(q) || (p.serie_a_team ?? '').toLowerCase().includes(q))
      .sort((a, b) => (b.fvm ?? 0) - (a.fvm ?? 0))
      .slice(0, 50)
  }, [allPlayers, search, roleFilter])

  const targetPlayers = useMemo(() => {
    return allPlayers
      .filter(p => targets.has(p.id))
      .sort((a, b) => (b.fvm ?? 0) - (a.fvm ?? 0))
  }, [allPlayers, targets])

  const totalMaxSpend = Array.from(targets.values()).reduce((s, v) => s + v, 0)

  function toggle(playerId: number) {
    startTransition(async () => {
      if (targets.has(playerId)) {
        setTargets(prev => { const next = new Map(prev); next.delete(playerId); return next })
        await removeTarget(playerId)
      } else {
        setTargets(prev => new Map(prev).set(playerId, 1))
        await addTarget(playerId, 1)
      }
    })
  }

  function changePrice(playerId: number, price: number) {
    const safe = Math.max(1, price)
    setTargets(prev => new Map(prev).set(playerId, safe))
    startTransition(async () => { await updateTargetPrice(playerId, safe) })
  }

  function PlayerRowItem({ p, showPrice }: { p: PlayerRow; showPrice: boolean }) {
    const isTarget = targets.has(p.id)
    const maxPrice = targets.get(p.id) ?? 1
    return (
      <div className={`flex items-center gap-2 py-2 border-b last:border-0 ${p.in_active_auction ? 'opacity-60' : ''}`}>
        <button
          onClick={() => toggle(p.id)}
          disabled={isPending}
          className={`w-6 h-6 rounded-full flex-shrink-0 border-2 flex items-center justify-center text-xs font-bold transition-colors ${isTarget ? 'text-white border-transparent' : 'text-gray-300 border-gray-300 hover:border-red-400'}`}
          style={isTarget ? { background: 'var(--boccea-red)', borderColor: 'var(--boccea-red)' } : undefined}
        >
          {isTarget ? '✓' : '+'}
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{p.name}</p>
          <p className="text-xs text-gray-400 truncate">
            {p.roles.join('/')} · {p.serie_a_team ?? '—'}
            {p.fvm != null && <span className="ml-1 font-semibold text-gray-600">FVM {p.fvm}</span>}
          </p>
        </div>
        {showPrice && isTarget && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-xs text-gray-400">max</span>
            <input
              type="number"
              min={1}
              value={maxPrice}
              onChange={e => changePrice(p.id, parseInt(e.target.value) || 1)}
              className="w-14 text-xs border rounded px-1 py-0.5 text-center"
            />
            <span className="text-xs text-gray-400">cr</span>
          </div>
        )}
        {p.in_active_auction && (
          <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 rounded flex-shrink-0">asta</span>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Tab */}
      <div className="flex border-b">
        <button
          onClick={() => setTab('targets')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'targets' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500'}`}
          style={tab === 'targets' ? { borderColor: 'var(--boccea-red)', color: 'var(--boccea-red)' } : undefined}
        >
          🎯 Targets ({targets.size})
        </button>
        <button
          onClick={() => setTab('search')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'search' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500'}`}
          style={tab === 'search' ? { borderColor: 'var(--boccea-red)', color: 'var(--boccea-red)' } : undefined}
        >
          🔍 Cerca
        </button>
      </div>

      {tab === 'targets' && (
        <>
          {targets.size === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">
              Nessun target. Vai su &ldquo;Cerca&rdquo; per aggiungerne.
            </p>
          ) : (
            <>
              <div className="text-xs text-gray-500 flex justify-between">
                <span>{targets.size} giocatori in lista</span>
                <span className={totalMaxSpend > budget ? 'text-red-500 font-semibold' : ''}>
                  Spesa max totale: {totalMaxSpend} cr {totalMaxSpend > budget ? '⚠️ supera budget' : ''}
                </span>
              </div>
              <div>
                {targetPlayers.map(p => (
                  <PlayerRowItem key={p.id} p={p} showPrice={true} />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {tab === 'search' && (
        <>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Cerca calciatore o squadra..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 border rounded-lg px-3 py-2 text-sm"
            />
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="border rounded-lg px-2 py-2 text-sm"
            >
              <option value="">Tutti</option>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            {filtered.map(p => (
              <PlayerRowItem key={p.id} p={p} showPrice={false} />
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-gray-400 py-4 text-center">Nessun risultato</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
