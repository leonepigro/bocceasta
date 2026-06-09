'use client'
import { useState, useEffect, useTransition } from 'react'
import type { AuctionWithPlayer, Team } from '@/lib/supabase/types'
import { placeBid } from '@/lib/auction/actions'

type Props = {
  auction: AuctionWithPlayer
  currentTeam: Team
}

function useCountdown(expiresAt: string) {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
  )

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft(Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)))
    }, 1000)
    return () => clearInterval(interval)
  }, [expiresAt])

  return secondsLeft
}

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export function AuctionCard({ auction, currentTeam }: Props) {
  const secondsLeft = useCountdown(auction.expires_at)
  const [bidAmount, setBidAmount] = useState(auction.current_price + 1)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isExpired = secondsLeft === 0
  const isWinning = auction.current_winner_team_id === currentTeam.id
  const isLastMinute = secondsLeft < 60

  function handleBid(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await placeBid(auction.id, bidAmount)
      if (result.error) setError(result.error)
    })
  }

  return (
    <div className={`bg-white rounded-xl shadow p-4 border-l-4 ${isWinning ? 'border-green-500' : 'border-gray-200'}`}>
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="font-bold">{auction.players.name}</p>
          <p className="text-xs text-gray-500">
            {auction.players.roles.join(' · ')} — {auction.players.serie_a_team}
          </p>
        </div>
        <div className="text-right">
          <p className={`text-sm font-mono font-bold ${isLastMinute ? 'text-red-500 animate-pulse' : 'text-gray-600'}`}>
            {isExpired ? 'SCADUTA' : formatTime(secondsLeft)}
          </p>
          {auction.players.fvm && (
            <p className="text-xs text-gray-400">FVM {auction.players.fvm}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl font-bold text-blue-600">{auction.current_price} cr</span>
        {auction.teams_winner && (
          <span className={`text-sm px-2 py-0.5 rounded-full ${isWinning ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
            {isWinning ? '✓ Tu' : auction.teams_winner.team_name}
          </span>
        )}
      </div>

      {!isExpired && !isWinning && (
        <form onSubmit={handleBid} className="flex gap-2">
          <input
            type="number"
            min={auction.current_price + 1}
            max={currentTeam.budget_remaining}
            value={bidAmount}
            onChange={e => setBidAmount(parseInt(e.target.value) || auction.current_price + 1)}
            className="flex-1 border rounded-lg px-3 py-1.5 text-sm"
          />
          <button
            type="submit"
            disabled={isPending}
            className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-50"
          >
            {isPending ? '...' : 'Rilancia'}
          </button>
        </form>
      )}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )
}
