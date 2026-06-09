'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
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
  const router = useRouter()
  const supabase = createClient()

  async function handleSearch(value: string) {
    setQuery(value)
    setSelected(null)
    if (value.length < 2) { setResults([]); return }
    const players = await searchAvailablePlayers(supabase, value, config.enabled_roles)
    setResults(players)
  }

  function handleSelect(player: Player) {
    setSelected(player)
    setQuery(player.name)
    setResults([])
    setInitialBid(1)
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
        router.refresh()
      }
    })
  }

  if (!config.enabled_roles.length) return null

  return (
    <section className="bg-white rounded-xl shadow-sm p-4">
      <h2 className="font-semibold mb-1 text-sm" style={{ color: 'var(--boccea-red)' }}>
        Lancia asta — {config.enabled_roles.join(', ')}
      </h2>

      <form onSubmit={handleLaunch} className="mt-2">
        <div className="relative mb-2">
          <input
            type="text"
            placeholder="Cerca giocatore da mettere all'asta..."
            value={query}
            onChange={e => handleSearch(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1"
          />
          {results.length > 0 && (
            <ul className="absolute z-10 w-full bg-white border rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
              {results.map(p => (
                <li
                  key={p.id}
                  onClick={() => handleSelect(p)}
                  className="px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer flex justify-between items-center"
                >
                  <span className="font-medium">{p.name}</span>
                  <span className="text-gray-400 text-xs">{p.roles.join('/')} · {p.serie_a_team}{p.fvm ? ` · FVM ${p.fvm}` : ''}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {selected && (
          <div className="flex gap-2 items-center">
            <span className="text-xs text-gray-500 flex-1 truncate">
              <span className="font-medium text-gray-700">{selected.name}</span>
              {' · '}{selected.roles.join('/')}
            </span>
            <input
              type="number"
              min={1}
              value={initialBid}
              onChange={e => setInitialBid(parseInt(e.target.value) || 1)}
              className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center"
              placeholder="cr"
            />
            <button
              type="submit"
              disabled={isPending}
              className="text-white px-4 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-50 whitespace-nowrap"
              style={{ background: 'var(--boccea-red)' }}
            >
              {isPending ? '...' : 'Lancia'}
            </button>
          </div>
        )}
      </form>

      {error && <p className="text-xs mt-2 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg">{error}</p>}
    </section>
  )
}
