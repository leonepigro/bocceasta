'use client'
import { useState, useTransition } from 'react'
import { updateWishlistConfig } from '@/lib/preferences/actions'

type WishlistCfg = {
  enabled: boolean
  maxTotal: number
  maxPerRole: Record<string, number>
  maxFvm: number
}

const ALL_ROLES = ['Por', 'Dc', 'B', 'Dd', 'Ds', 'E', 'M', 'C', 'T', 'W', 'A', 'Pc']

const ROLE_COLOR: Record<string, string> = {
  Por: '#f59e0b', Dc: '#3b82f6', B: '#3b82f6', Dd: '#60a5fa', Ds: '#60a5fa',
  E: '#06b6d4', M: '#10b981', C: '#10b981', T: '#8b5cf6', W: '#8b5cf6',
  A: '#ef4444', Pc: '#ef4444',
}

export function WishlistConfigSection({ initial }: { initial: WishlistCfg }) {
  const [cfg, setCfg] = useState<WishlistCfg>(initial)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function update<K extends keyof WishlistCfg>(key: K, val: WishlistCfg[K]) {
    setCfg(c => ({ ...c, [key]: val }))
    setSaved(false)
  }
  function updateRole(role: string, val: number) {
    setCfg(c => ({ ...c, maxPerRole: { ...c.maxPerRole, [role]: val } }))
    setSaved(false)
  }

  const totalPerRoleSum = ALL_ROLES.reduce((s, r) => s + (cfg.maxPerRole[r] ?? 0), 0)
  const overTotal = totalPerRoleSum > cfg.maxTotal

  function save() {
    setError(null)
    startTransition(async () => {
      const r = await updateWishlistConfig(cfg)
      if ('error' in r && r.error) setError(r.error)
      else { setSaved(true); setTimeout(() => setSaved(false), 2000) }
    })
  }

  return (
    <div className="space-y-4">
      <div className="border-b pb-2">
        <h2 className="text-lg font-bold">⭐ Wishlist — configurazione</h2>
        <p className="text-xs text-gray-500 mt-1">Regola i limiti delle preferenze utenti per il sorteggio.</p>
      </div>

      {/* Enable */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={cfg.enabled}
          onChange={e => update('enabled', e.target.checked)} className="w-4 h-4" />
        <span className="text-sm font-semibold">Wishlist abilitata</span>
        <span className="text-xs text-gray-400">
          {cfg.enabled ? 'utenti possono creare wishlist, sorteggio applica preferenze' : 'wishlist disabilitate per tutti'}
        </span>
      </label>

      <div className={cfg.enabled ? '' : 'opacity-40 pointer-events-none'}>
        {/* Max totale */}
        <div className="border rounded-lg p-3 space-y-2">
          <label className="text-xs font-semibold text-gray-600">
            Massimo giocatori in wishlist (totale)
          </label>
          <input type="number" min={1} max={100} value={cfg.maxTotal}
            onChange={e => update('maxTotal', Number(e.target.value))}
            className="border rounded px-2 py-1 w-24 text-sm" />
        </div>

        {/* Max FVM (Quotazione) */}
        <div className="border rounded-lg p-3 space-y-2 mt-3">
          <label className="text-xs font-semibold text-gray-600">
            Cap Quotazione totale wishlist
          </label>
          <div className="flex items-center gap-2">
            <input type="number" min={0} max={5000} value={cfg.maxFvm}
              onChange={e => update('maxFvm', Number(e.target.value))}
              className="border rounded px-2 py-1 w-28 text-sm" />
            <span className="text-xs text-gray-500">0 = nessun cap esplicito (usa solo media auto durante sorteggio)</span>
          </div>
          <p className="text-xs text-gray-400">
            <strong>Suggerimento</strong>: imposta a un valore <em>inferiore</em> alla media per team (~1195) per garantire 23 slot outfield minimi anche stackando top.
          </p>
        </div>

        {/* Max per ruolo */}
        <div className="border rounded-lg p-3 mt-3 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-600">Massimo per ruolo</label>
            <span className={`text-xs ${overTotal ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>
              Somma per ruolo: {totalPerRoleSum} {overTotal && '⚠ supera totale'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {ALL_ROLES.map(r => (
              <div key={r} className="flex items-center gap-2">
                <span className="text-white text-xs font-bold px-2 py-1 rounded w-9 text-center"
                  style={{ background: ROLE_COLOR[r] }}>{r}</span>
                <input type="number" min={0} max={20}
                  value={cfg.maxPerRole[r] ?? 0}
                  onChange={e => updateRole(r, Number(e.target.value))}
                  className="border rounded px-2 py-1 w-16 text-sm" />
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400">
            <strong>Nota</strong>: per <code>Por</code>, possono opzionare solo il portiere più costoso di ogni squadra Serie A.
          </p>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3 pt-2">
        <button onClick={save} disabled={isPending}
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">
          {isPending ? 'Salvo…' : 'Salva configurazione'}
        </button>
        {saved && <span className="text-green-600 text-sm">✓ salvato</span>}
        {error && <span className="text-red-600 text-sm">{error}</span>}
      </div>
    </div>
  )
}
