'use client'
import { useState, useTransition, useMemo } from 'react'
import { togglePreference } from '@/lib/preferences/actions'

const MAX_WISHLIST = 30

type Player = {
  id: number
  name: string
  roles: string[]
  fvm: number | null
  serie_a_team: string | null
}

const ROLE_COLOR: Record<string, string> = {
  Por: '#f59e0b', Dc: '#3b82f6', B: '#3b82f6', Dd: '#60a5fa', Ds: '#60a5fa',
  E: '#06b6d4', M: '#10b981', C: '#10b981', T: '#8b5cf6', W: '#8b5cf6',
  A: '#ef4444', Pc: '#ef4444',
}

const ALL_ROLES = ['Por', 'Dc', 'B', 'Dd', 'Ds', 'E', 'M', 'C', 'T', 'W', 'A', 'Pc']

export function PreferencesEditor({
  players, initialPreferences,
}: { players: Player[]; initialPreferences: number[] }) {
  const [prefs, setPrefs] = useState(new Set(initialPreferences))
  const [filter, setFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [showOnlySelected, setShowOnlySelected] = useState(false)
  const [, startTransition] = useTransition()

  const filtered = useMemo(() => {
    const q = filter.toLowerCase().trim()
    return players.filter(p => {
      if (showOnlySelected && !prefs.has(p.id)) return false
      if (roleFilter !== 'all' && !p.roles.includes(roleFilter)) return false
      if (q && !p.name.toLowerCase().includes(q) &&
          !(p.serie_a_team ?? '').toLowerCase().includes(q)) return false
      return true
    })
  }, [players, filter, roleFilter, showOnlySelected, prefs])

  const countByRole = useMemo(() => {
    const c: Record<string, number> = {}
    for (const id of prefs) {
      const p = players.find(x => x.id === id)
      if (!p) continue
      const role = p.roles[0]
      c[role] = (c[role] ?? 0) + 1
    }
    return c
  }, [prefs, players])

  const isFull = prefs.size >= MAX_WISHLIST

  function toggle(id: number) {
    const newSet = new Set(prefs)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      if (isFull) return
      newSet.add(id)
    }
    setPrefs(newSet)
    startTransition(() => { togglePreference(id) })
  }

  return (
    <div className="space-y-4">
      {/* Intro */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700 space-y-1">
        <p><strong>Come funziona</strong>: clicca i giocatori che vorresti nella tua rosa (max {MAX_WISHLIST}).</p>
        <p>Al sorteggio, a parità di Quotazione vincerai tu su chi non li ha in wishlist.</p>
        <p>Strategia: mescola top con giocatori medi che pensi pochi punteranno.</p>
      </div>

      {/* Counter per ruolo */}
      <div className={`border rounded-lg p-3 ${isFull ? 'border-orange-300 bg-orange-50' : ''}`}>
        <p className="text-xs text-gray-500 mb-2">
          Wishlist: <strong className={isFull ? 'text-orange-600' : ''}>{prefs.size} / {MAX_WISHLIST} giocatori</strong>
          {isFull && <span className="text-orange-600 ml-2">— limite raggiunto, rimuovi qualcuno per aggiungere altri</span>}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {ALL_ROLES.map(r => {
            const c = countByRole[r] ?? 0
            return (
              <span key={r}
                className={`text-xs px-2 py-1 rounded font-mono ${c > 0 ? 'text-white' : 'text-gray-400 bg-gray-100'}`}
                style={c > 0 ? { background: ROLE_COLOR[r] } : undefined}>
                {r} {c}
              </span>
            )
          })}
        </div>
      </div>

      {/* Filtri */}
      <div className="space-y-2">
        <input
          type="text" placeholder="Cerca per nome o squadra Serie A..."
          value={filter} onChange={e => setFilter(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm" />
        <div className="flex gap-2 items-center flex-wrap">
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
            className="border rounded px-2 py-1 text-xs">
            <option value="all">Tutti i ruoli</option>
            {ALL_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <label className="text-xs flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={showOnlySelected}
              onChange={e => setShowOnlySelected(e.target.checked)} />
            Solo in wishlist
          </label>
          <p className="text-xs text-gray-400 ml-auto">{filtered.length} risultati</p>
        </div>
      </div>

      {/* Lista giocatori */}
      <div className="border rounded-lg divide-y max-h-[60vh] overflow-y-auto">
        {filtered.slice(0, 500).map(p => {
          const selected = prefs.has(p.id)
          const disabled = !selected && isFull
          return (
            <button key={p.id} onClick={() => toggle(p.id)} disabled={disabled}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left transition
                ${selected ? 'bg-blue-50' : ''}
                ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-blue-50'}`}>
              <span className="text-base w-5">{selected ? '★' : '☆'}</span>
              <span className="text-white text-xs font-bold px-1.5 py-0.5 rounded w-8 text-center flex-shrink-0"
                style={{ background: ROLE_COLOR[p.roles[0]] ?? '#9ca3af' }}>
                {p.roles[0]}
              </span>
              <span className="flex-1 text-sm truncate">{p.name}</span>
              <span className="text-xs text-gray-400 w-20 truncate text-right">{p.serie_a_team ?? '—'}</span>
              <span className="text-xs font-bold text-gray-500 w-10 text-right">{p.fvm ?? '—'}</span>
            </button>
          )
        })}
        {filtered.length > 500 && (
          <p className="text-xs text-center text-gray-400 py-3">Mostrati primi 500. Affina i filtri.</p>
        )}
      </div>
    </div>
  )
}
