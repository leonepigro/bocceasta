'use client'
import { useState, useTransition, useMemo } from 'react'
import { togglePreference } from '@/lib/preferences/actions'

const N_TEAMS = 10  // numero squadre Bocceasta

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

type Props = {
  players: Player[]
  initialPreferences: number[]
  maxTotal: number
  maxPerRole: Record<string, number>
  maxFvm: number  // 0 = no cap esplicito
}

export function PreferencesEditor({ players, initialPreferences, maxTotal, maxPerRole, maxFvm }: Props) {
  const MAX_WISHLIST = maxTotal
  const [prefs, setPrefs] = useState(new Set(initialPreferences))
  const [filter, setFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [showOnlySelected, setShowOnlySelected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  // Set di ID portieri opzionabili: solo il top FVM per ogni squadra Serie A.
  // Motivo: i portieri vengono assegnati in blocco (tutti della squadra a chi pesca quella squadra).
  const allowedGkIds = useMemo(() => {
    const topPerTeam = new Map<string, Player>()
    for (const p of players) {
      if (p.roles[0] !== 'Por' || !p.serie_a_team) continue
      const cur = topPerTeam.get(p.serie_a_team)
      if (!cur || (p.fvm ?? 0) > (cur.fvm ?? 0)) topPerTeam.set(p.serie_a_team, p)
    }
    return new Set([...topPerTeam.values()].map(p => p.id))
  }, [players])

  // Giocatori visibili nella lista
  const filtered = useMemo(() => {
    const q = filter.toLowerCase().trim()
    return players.filter(p => {
      // Portieri: solo top per squadra Serie A
      if (p.roles[0] === 'Por' && !allowedGkIds.has(p.id)) return false
      if (showOnlySelected && !prefs.has(p.id)) return false
      if (roleFilter !== 'all' && !p.roles.includes(roleFilter)) return false
      if (q) {
        const matchesName = p.name.toLowerCase().includes(q)
        const matchesTeam = (p.serie_a_team ?? '').toLowerCase().includes(q)
        const matchesRole = p.roles.some(r => r.toLowerCase() === q)
        if (!matchesName && !matchesTeam && !matchesRole) return false
      }
      return true
    })
  }, [players, filter, roleFilter, showOnlySelected, prefs, allowedGkIds])

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

  const wishlistFvm = useMemo(() => {
    let s = 0
    for (const id of prefs) {
      const p = players.find(x => x.id === id)
      if (p?.fvm) s += p.fvm
    }
    return s
  }, [prefs, players])

  // Media corretta: somma solo dei giocatori effettivamente distribuiti nel sorteggio,
  // diviso N_TEAMS. Esclude leftover per role (floor(count/N)*N distribuiti, gli altri scartati).
  // Portieri: i sorteggio assegna in blocco per squadra → conta TUTTI i portieri.
  const avgPerTeam = useMemo(() => {
    const byRole = new Map<string, number[]>()
    for (const p of players) {
      const r = p.roles[0]
      const arr = byRole.get(r) ?? []
      arr.push(p.fvm ?? 0)
      byRole.set(r, arr)
    }
    let total = 0
    for (const [role, fvms] of byRole) {
      const sorted = [...fvms].sort((a, b) => b - a)
      if (role === 'Por') {
        // Portieri: tutti contano (blocco per squadra Serie A)
        total += sorted.reduce((s, v) => s + v, 0)
      } else {
        // Outfield: floor(N/teams) * teams distribuiti, top FVM
        const take = Math.floor(sorted.length / N_TEAMS) * N_TEAMS
        total += sorted.slice(0, take).reduce((s, v) => s + v, 0)
      }
    }
    return Math.round(total / N_TEAMS)
  }, [players])

  const isFull = prefs.size >= MAX_WISHLIST
  const effectiveCap = maxFvm > 0 ? maxFvm : avgPerTeam
  const overAvg = wishlistFvm > effectiveCap

  function countPrefsInRole(role: string): number {
    let c = 0
    for (const id of prefs) {
      const p = players.find(x => x.id === id)
      if (p?.roles[0] === role) c++
    }
    return c
  }

  function toggle(id: number) {
    const player = players.find(p => p.id === id)
    if (!player) return
    setError(null)
    const newSet = new Set(prefs)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      if (isFull) {
        setError(`Limite wishlist raggiunto (${MAX_WISHLIST})`)
        return
      }
      const role = player.roles[0]
      const roleLimit = maxPerRole[role]
      if (roleLimit != null && countPrefsInRole(role) >= roleLimit) {
        setError(`Limite per ruolo ${role} raggiunto (${roleLimit})`)
        return
      }
      // Cap Quotazione: solo se admin ha impostato un cap esplicito (>0)
      if (maxFvm > 0 && wishlistFvm + (player.fvm ?? 0) > maxFvm) {
        setError(`Cap Quotazione superato (${wishlistFvm + (player.fvm ?? 0)} / ${maxFvm} max)`)
        return
      }
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

      {/* Counter */}
      <div className={`border rounded-lg p-3 space-y-2 ${isFull ? 'border-orange-300 bg-orange-50' : ''}`}>
        <p className="text-xs text-gray-500">
          Wishlist: <strong className={isFull ? 'text-orange-600' : ''}>{prefs.size} / {MAX_WISHLIST} giocatori</strong>
          {isFull && <span className="text-orange-600 ml-2">— limite raggiunto</span>}
        </p>

        {/* Quotazione totale vs media/cap */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-500">Quotazione wishlist:</span>
          <strong className={overAvg ? 'text-red-600' : 'text-gray-700'}>
            {wishlistFvm}
          </strong>
          <span className="text-gray-400">
            / {effectiveCap} {maxFvm > 0 ? 'cap' : 'media'}
          </span>
          <span className="relative group cursor-help">
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-gray-600 text-[10px] font-bold">?</span>
            <span className="absolute left-0 top-5 z-10 hidden group-hover:block bg-gray-800 text-white text-[11px] rounded-lg p-2.5 w-72 shadow-lg leading-relaxed">
              <strong>Come funziona la wishlist</strong><br/>
              Al sorteggio, quando un giocatore in wishlist sta per essere assegnato:<br/>
              • Se più partecipanti lo hanno in wishlist → vince chi è <em>sotto la media</em> di quotazione totale, con piccola penalty per chi ha già vinto conflitti<br/>
              • Se un solo partecipante lo ha → va a lui, ma solo se è sotto media<br/>
              • Sopra media → l&apos;effetto wishlist si annulla, vince il normale bilanciamento<br/><br/>
              Per questo: <strong>tenere la somma wishlist vicino alla media</strong> aumenta le tue chance. Stackare top porta a poche vittorie.
            </span>
          </span>
          {overAvg && (
            <span className="text-red-600 font-semibold ml-1">⚠ oltre media</span>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {ALL_ROLES.map(r => {
            const c = countByRole[r] ?? 0
            const lim = maxPerRole[r]
            const atLimit = lim != null && c >= lim
            return (
              <span key={r}
                className={`text-xs px-2 py-1 rounded font-mono ${c > 0 ? 'text-white' : 'text-gray-400 bg-gray-100'} ${atLimit ? 'ring-2 ring-orange-400' : ''}`}
                style={c > 0 ? { background: ROLE_COLOR[r] } : undefined}>
                {r} {c}{lim != null && <span className="opacity-70">/{lim}</span>}
              </span>
            )
          })}
        </div>
        {error && (
          <p className="text-xs text-red-600 font-semibold">{error}</p>
        )}
      </div>

      {/* Filtri */}
      <div className="space-y-2">
        {/* Search prominente */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base">🔍</span>
          <input
            type="text" placeholder="Cerca per nome, squadra Serie A o ruolo (es. Calhanoglu, Inter, M)..."
            value={filter} onChange={e => setFilter(e.target.value)}
            className="w-full border-2 rounded-lg pl-10 pr-3 py-2.5 text-sm focus:border-red-300 focus:outline-none" />
          {filter && (
            <button onClick={() => setFilter('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">✕</button>
          )}
        </div>
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
          const primary = p.roles[0]
          return (
            <button key={p.id} onClick={() => toggle(p.id)} disabled={disabled}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition
                ${selected ? 'bg-blue-50' : ''}
                ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-blue-50'}`}>
              <span className="text-base w-5 flex-shrink-0">{selected ? '★' : '☆'}</span>
              {/* Ruoli: primario filled + bordo doppio, secondari outline */}
              <span className="flex items-center gap-0.5 flex-shrink-0">
                {p.roles.map((r, i) => {
                  const isPrimary = i === 0
                  return (
                    <span key={r}
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isPrimary ? 'text-white ring-2 ring-offset-1 ring-gray-700' : 'border'}`}
                      style={isPrimary
                        ? { background: ROLE_COLOR[r] ?? '#9ca3af' }
                        : { color: ROLE_COLOR[r] ?? '#9ca3af', borderColor: ROLE_COLOR[r] ?? '#d1d5db' }}
                      title={isPrimary ? `${r} (primario)` : r}>
                      {r}
                    </span>
                  )
                })}
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

      <p className="text-[11px] text-gray-400 text-center">
        Il <strong className="text-gray-600">primo ruolo (cerchiato in scuro)</strong> è quello con cui il giocatore occupa lo slot nel sorteggio.
      </p>
    </div>
  )
}
