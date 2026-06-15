'use client'
import { useState, useMemo } from 'react'

type Player = {
  id: number
  name: string
  roles: string[]
  fvm: number | null
  serie_a_team: string | null
  sold_to_team_id: string | null
}

type TeamRoster = {
  id: string
  team_name: string
  owner_name: string | null
  players: Player[]
}

const ROLE_ORDER = ['Por', 'Dc', 'B', 'Dd', 'Ds', 'E', 'M', 'C', 'T', 'W', 'A', 'Pc']
const ROLE_COLOR: Record<string, string> = {
  Por: '#f59e0b', Dc: '#3b82f6', B: '#3b82f6', Dd: '#60a5fa', Ds: '#60a5fa',
  E: '#06b6d4', M: '#10b981', C: '#10b981', T: '#8b5cf6', W: '#8b5cf6',
  A: '#ef4444', Pc: '#ef4444',
}

export function RostersView({
  myTeamId, rosters, freeAgents,
}: {
  myTeamId: string
  rosters: TeamRoster[]
  freeAgents: Player[]
}) {
  const [selected, setSelected] = useState<string>(myTeamId)
  const [search, setSearch] = useState('')

  const sortedRosters = useMemo(() => {
    const me = rosters.find(r => r.id === myTeamId)
    const others = rosters
      .filter(r => r.id !== myTeamId)
      .sort((a, b) => a.team_name.localeCompare(b.team_name))
    return me ? [me, ...others] : rosters
  }, [rosters, myTeamId])

  const isFree = selected === '__free__'
  const currentRoster = rosters.find(r => r.id === selected)
  const visiblePlayers = isFree ? freeAgents : (currentRoster?.players ?? [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return visiblePlayers
    return visiblePlayers.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.serie_a_team ?? '').toLowerCase().includes(q)
    )
  }, [visiblePlayers, search])

  const grouped = useMemo(() => {
    const m = new Map<string, Player[]>()
    for (const p of filtered) {
      const r = p.roles[0]
      const arr = m.get(r) ?? []
      arr.push(p)
      m.set(r, arr)
    }
    return ROLE_ORDER
      .filter(r => m.has(r))
      .map(r => ({
        role: r,
        players: (m.get(r) ?? []).sort((a, b) => (b.fvm ?? 0) - (a.fvm ?? 0)),
      }))
  }, [filtered])

  const fvmTotal = filtered.reduce((s, p) => s + (p.fvm ?? 0), 0)

  return (
    <div className="space-y-4">
      {/* Tabs squadre */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        {sortedRosters.map(r => (
          <button key={r.id} onClick={() => setSelected(r.id)}
            className={`px-3 py-1.5 text-xs rounded-lg font-semibold whitespace-nowrap transition-colors
              ${selected === r.id
                ? 'text-white shadow'
                : r.id === myTeamId
                  ? 'border-2 border-red-300 text-red-700 bg-white'
                  : 'border text-gray-600 bg-white hover:bg-gray-50'}`}
            style={selected === r.id ? { background: 'var(--boccea-red)' } : undefined}>
            {r.id === myTeamId && <span className="mr-1">⭐</span>}
            {r.team_name}
            <span className="ml-1.5 opacity-70 font-mono text-[10px]">{r.players.length}</span>
          </button>
        ))}
        <button onClick={() => setSelected('__free__')}
          className={`px-3 py-1.5 text-xs rounded-lg font-semibold whitespace-nowrap transition-colors flex-shrink-0
            ${isFree ? 'text-white shadow' : 'border text-gray-600 bg-white hover:bg-gray-50'}`}
          style={isFree ? { background: '#6b7280' } : undefined}>
          🆓 Svincolati
          <span className="ml-1.5 opacity-70 font-mono text-[10px]">{freeAgents.length}</span>
        </button>
      </div>

      {/* Intestazione */}
      <div className="border-b pb-2 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-base">
            {isFree ? 'Giocatori svincolati' : currentRoster?.team_name}
            {!isFree && currentRoster?.id === myTeamId && <span className="ml-2 text-red-600 text-xs">(la tua rosa)</span>}
          </h2>
          {!isFree && currentRoster?.owner_name && (
            <p className="text-xs text-gray-500">{currentRoster.owner_name}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">{filtered.length} giocatori</p>
          <p className="text-sm font-bold" style={{ color: 'var(--boccea-gold)' }}>
            Quotazione {fvmTotal}
          </p>
        </div>
      </div>

      {/* Search */}
      <input
        type="text" placeholder="Cerca nome o squadra Serie A..."
        value={search} onChange={e => setSearch(e.target.value)}
        className="w-full border rounded-lg px-3 py-2 text-sm" />

      {/* Lista raggruppata per ruolo */}
      {grouped.length === 0 ? (
        <p className="text-center text-gray-400 py-8 text-sm">
          {isFree ? 'Nessun giocatore svincolato' : 'Nessun giocatore'}
        </p>
      ) : (
        <div className="space-y-3">
          {grouped.map(g => (
            <div key={g.role}>
              <p className="text-xs font-bold text-gray-500 mb-1.5 px-1">
                <span className="text-white text-[10px] font-bold px-2 py-0.5 rounded mr-2"
                  style={{ background: ROLE_COLOR[g.role] }}>{g.role}</span>
                {g.players.length} giocatori
              </p>
              <div className="border rounded-lg divide-y">
                {g.players.map(p => (
                  <div key={p.id} className="flex items-center gap-3 px-3 py-2">
                    <span className="flex gap-0.5 flex-shrink-0">
                      {p.roles.map(r => (
                        <span key={r} className="text-white text-xs font-bold px-1.5 py-0.5 rounded text-center"
                          style={{ background: ROLE_COLOR[r] ?? '#9ca3af' }}>
                          {r}
                        </span>
                      ))}
                    </span>
                    <span className="flex-1 text-sm truncate">{p.name}</span>
                    <span className="text-xs text-gray-400 w-20 truncate text-right">{p.serie_a_team ?? '—'}</span>
                    <span className="text-xs font-bold text-gray-500 w-10 text-right">{p.fvm ?? '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
