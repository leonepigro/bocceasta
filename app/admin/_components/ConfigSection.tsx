'use client'
import { useState, useTransition } from 'react'
import { updateConfig } from '@/lib/admin/actions'
import type { Config } from '@/lib/supabase/types'

type Props = { config: Config }

export function ConfigSection({ config: initial }: Props) {
  const [cfg, setCfg] = useState(initial)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  function handleChange(key: keyof Config, value: number) {
    setCfg(prev => ({ ...prev, [key]: value }))
  }

  function handleSave() {
    startTransition(async () => {
      await updateConfig(cfg)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  const fields: { key: keyof Config; label: string }[] = [
    { key: 'auction_duration_hours', label: 'Durata asta (ore)' },
    { key: 'last_minute_threshold_minutes', label: 'Soglia ultimo minuto (min)' },
    { key: 'last_minute_extension_minutes', label: 'Estensione ultimo minuto (min)' },
    { key: 'max_active_auctions_total', label: 'Max aste contemporanee totali' },
    { key: 'max_active_auctions_per_team', label: 'Max aste per squadra' },
  ]

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Configurazione aste</h2>
      <div className="space-y-3 mb-4">
        {fields.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between">
            <label className="text-sm text-gray-700">{label}</label>
            <input
              type="number"
              min={1}
              value={cfg[key] as number}
              onChange={e => handleChange(key, parseInt(e.target.value) || 1)}
              className="w-20 border rounded-lg px-2 py-1 text-sm text-right"
            />
          </div>
        ))}
      </div>
      <button
        onClick={handleSave}
        disabled={isPending}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
      >
        {saved ? 'Salvato' : isPending ? 'Salvataggio...' : 'Salva configurazione'}
      </button>
    </div>
  )
}
