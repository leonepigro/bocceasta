'use client'
import { useState, useEffect, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updateEnabledRoles } from '@/lib/admin/actions'
import type { Config } from '@/lib/supabase/types'

type Props = { config: Config }

export function RolesSection({ config }: Props) {
  const [availableRoles, setAvailableRoles] = useState<string[]>([])
  const [enabled, setEnabled] = useState<string[]>(config.enabled_roles)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.rpc('get_distinct_roles').then(({ data }) => {
      if (data) setAvailableRoles(data as string[])
    })
  }, [])

  function toggle(role: string) {
    setEnabled(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    )
  }

  function handleSave() {
    startTransition(async () => {
      await updateEnabledRoles(enabled)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Ruoli abilitati al lancio</h2>
      <p className="text-sm text-gray-400 mb-3">
        {availableRoles.length === 0 ? 'Importa prima i giocatori per vedere i ruoli disponibili.' : 'Seleziona i ruoli che i partecipanti possono mettere all\'asta.'}
      </p>
      <div className="flex flex-wrap gap-2 mb-4">
        {availableRoles.map(role => (
          <button
            key={role}
            onClick={() => toggle(role)}
            className={`px-3 py-1 rounded-full text-sm border ${
              enabled.includes(role)
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-300'
            }`}
          >
            {role}
          </button>
        ))}
      </div>
      <button
        onClick={handleSave}
        disabled={isPending}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
      >
        {saved ? 'Salvato' : isPending ? 'Salvataggio...' : 'Salva'}
      </button>
    </div>
  )
}
