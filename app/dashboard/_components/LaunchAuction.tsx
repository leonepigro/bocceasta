'use client'
import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Player, Config } from '@/lib/supabase/types'
import { launchAuction } from '@/lib/auction/actions'
import { searchAvailablePlayers } from '@/lib/players/queries'

type Props = { config: Config }

export function LaunchAuction({ config }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Player[]>([])
  const [selected, setSelected] = useState<Player | null>(null)
  const [initialBid, setInitialBid] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const supabase = createClient()

  async function handleSearch(value: string) {
    setQuery(value)
    if (value.length < 2) { setResults([]); return }
    const players = await searchAvailablePlayers(supabase, value, config.enabled_roles)
    setResults(players)
  }

  function handleSelect(player: Player) {
    setSelected(player)
    setQuery(player.name)
    setResults([])
  }

  function handleLaunch(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    setError(null)
    startTransition(async () => {
      const result = await launchAuction(selected.id, initialBid)
      if (result.error) {
        setError(result.error)
      } else {
        setSelected(null)
        setQuery('')
        setInitialBid(1)
      }
    })
  }

  if (!config.enabled_roles.length) return null

  return (
    <section className="bg-white rounded-xl shadow p-4">
      <h2 className="font-semibold mb-3">Lancia asta</h2>
      <p className="text-xs text-gray-400 mb-3">
        Ruoli: {config.enabled_roles.join(', ')}
      </p>
      <div className="relative mb-3">
        <input
          type="text"
          placeholder="Cerca giocatore..."
          value={query}
          onChange={e => handleSearch(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm"
        />
        {results.length > 0 && (
          <ul className="absolute z-10 w-full bg-white border rounded-lg shadow mt-1 max-h-48 overflow-y-auto">
            {results.map(p => (
              <li
                key={p.id}
                onClick={() => handleSelect(p)}
                className="px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
              >
                <span className="font-medium">{p.name}</span>
                <span className="text-gray-400 ml-2">{p.roles.join('/')} — {p.serie_a_team}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selected && (
        <form onSubmit={handleLaunch} className="flex gap-2">
          <input
            type="number"
            min={1}
            value={initialBid}
            onChange={e => setInitialBid(parseInt(e.target.value))}
            className="w-24 border rounded-lg px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
          >
            {isPending ? '...' : `Lancia ${selected.name}`}
          </button>
        </form>
      )}
      {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
    </section>
  )
}
