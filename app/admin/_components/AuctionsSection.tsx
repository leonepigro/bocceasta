'use client'
import { useTransition } from 'react'
import { adminCancelAuction } from '@/lib/admin/actions'

type AuctionRow = {
  id: string
  current_price: number
  expires_at: string
  players: { name: string; roles: string[] }
  teams_winner: { team_name: string } | null
}

type Props = { auctions: AuctionRow[] }

export function AuctionsSection({ auctions }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleCancel(id: string) {
    if (!confirm('Annullare questa asta? Il budget verrà sbloccato.')) return
    startTransition(async () => { await adminCancelAuction(id) })
  }

  if (!auctions.length) return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Aste attive</h2>
      <p className="text-gray-400">Nessuna asta attiva.</p>
    </div>
  )

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Aste attive ({auctions.length})</h2>
      <div className="space-y-2">
        {auctions.map(a => (
          <div key={a.id} className="flex items-center justify-between border rounded-lg p-3">
            <div>
              <p className="font-medium">{a.players.name}</p>
              <p className="text-xs text-gray-500">
                {a.players.roles.join('/')} — {a.current_price} cr —{' '}
                {a.teams_winner?.team_name ?? 'Nessun offerente'} —{' '}
                scade {new Date(a.expires_at).toLocaleString('it-IT')}
              </p>
            </div>
            <button
              onClick={() => handleCancel(a.id)}
              disabled={isPending}
              className="text-xs text-red-600 border border-red-300 px-2 py-1 rounded hover:bg-red-50 disabled:opacity-50"
            >
              Annulla
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
