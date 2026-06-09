'use client'
import { useState, useEffect, useTransition } from 'react'
import type { AuctionWithPlayer, Team } from '@/lib/supabase/types'
import { placeBid, setAutobid, removeAutobid } from '@/lib/auction/actions'

type Props = {
  auction: AuctionWithPlayer
  currentTeam: Team
  currentAutobid: number | null
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

export function AuctionCard({ auction, currentTeam, currentAutobid }: Props) {
  const secondsLeft = useCountdown(auction.expires_at)
  const [bidAmount, setBidAmount] = useState(auction.current_price + 1)
  const [autobidMax, setAutobidMax] = useState(auction.current_price + 1)
  const [showAutobid, setShowAutobid] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isExpired = secondsLeft === 0
  const isWinning = auction.current_winner_team_id === currentTeam.id
  const isLastMinute = secondsLeft < 60

  // Keep bid input in sync when auction price changes
  useEffect(() => {
    setBidAmount(prev => Math.max(prev, auction.current_price + 1))
    setAutobidMax(prev => Math.max(prev, auction.current_price + 1))
  }, [auction.current_price])

  function handleBid(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await placeBid(auction.id, bidAmount)
      if (result.error) setError(result.error)
    })
  }

  function handleSetAutobid(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await setAutobid(auction.id, autobidMax)
      if (result.error) setError(result.error)
      else setShowAutobid(false)
    })
  }

  function handleRemoveAutobid() {
    setError(null)
    startTransition(async () => {
      const result = await removeAutobid(auction.id)
      if (result.error) setError(result.error)
      else setShowAutobid(false)
    })
  }

  return (
    <div
      className={`bg-white rounded-xl shadow-sm p-4 border-l-4 ${isWinning ? '' : 'border-gray-200'}`}
      style={isWinning ? { borderLeftColor: 'var(--boccea-gold)' } : {}}
    >
      {/* Header */}
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

      {/* Prezzo e vincitore */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl font-bold" style={{ color: 'var(--boccea-red)' }}>
          {auction.current_price} cr
        </span>
        {auction.teams_winner && (
          <span
            className="text-sm px-2 py-0.5 rounded-full font-medium"
            style={isWinning
              ? { background: 'var(--boccea-gold-light)', color: '#7a4f00' }
              : { background: '#f3f4f6', color: '#4b5563' }}
          >
            {isWinning ? '★ Tu' : auction.teams_winner.team_name}
          </span>
        )}
      </div>

      {/* Azioni (solo se asta attiva e non vincente) */}
      {!isExpired && !isWinning && (
        <div className="space-y-2">
          {/* Rilancio manuale */}
          {!showAutobid && (
            <form onSubmit={handleBid} className="flex gap-2">
              <input
                type="number"
                min={auction.current_price + 1}
                max={currentTeam.budget_remaining}
                value={bidAmount}
                onChange={e => setBidAmount(parseInt(e.target.value) || auction.current_price + 1)}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
              />
              <button
                type="submit"
                disabled={isPending}
                className="text-white px-4 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-50"
                style={{ background: 'var(--boccea-red)' }}
              >
                {isPending ? '...' : 'Rilancia'}
              </button>
              <button
                type="button"
                onClick={() => setShowAutobid(true)}
                className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 text-gray-500 hover:bg-gray-50"
                title="Imposta autobid"
              >
                🤖
              </button>
            </form>
          )}

          {/* Autobid */}
          {showAutobid && (
            <form onSubmit={handleSetAutobid} className="space-y-2">
              <div className="flex gap-2 items-center">
                <span className="text-xs text-gray-500">🤖 Max autobid:</span>
                <input
                  type="number"
                  min={auction.current_price + 1}
                  max={currentTeam.budget_remaining}
                  value={autobidMax}
                  onChange={e => setAutobidMax(parseInt(e.target.value) || auction.current_price + 1)}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                />
                <button
                  type="submit"
                  disabled={isPending}
                  className="text-white px-3 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-50"
                  style={{ background: 'var(--boccea-gold)', color: '#7a4f00' }}
                >
                  Salva
                </button>
                <button
                  type="button"
                  onClick={() => setShowAutobid(false)}
                  className="px-2 py-1.5 rounded-lg text-sm text-gray-400 hover:bg-gray-50"
                >
                  ✕
                </button>
              </div>
              <p className="text-xs text-gray-400">
                Il sistema offrirà automaticamente +1 per te fino al tuo massimo.
                Se qualcuno supera il tuo max, sei battuto.
              </p>
              <button
                type="button"
                onClick={handleRemoveAutobid}
                disabled={isPending}
                className="text-xs text-red-500 hover:underline"
              >
                Rimuovi autobid
              </button>
            </form>
          )}
        </div>
      )}

      {/* Badge autobid attivo + pulsante modifica */}
      {!isExpired && isWinning && !showAutobid && (
        <div className="flex items-center gap-2 mt-1">
          {currentAutobid ? (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: 'var(--boccea-gold-light)', color: '#7a4f00' }}>
              🤖 Autobid max: {currentAutobid} cr
            </span>
          ) : (
            <span className="text-xs text-gray-400">Nessun autobid attivo</span>
          )}
          <button
            onClick={() => setShowAutobid(true)}
            className="text-xs px-2 py-0.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-50"
          >
            {currentAutobid ? 'Modifica' : '🤖 Imposta'}
          </button>
        </div>
      )}

      {/* Autobid per il vincente */}
      {!isExpired && isWinning && showAutobid && (
        <form onSubmit={handleSetAutobid} className="mt-2 space-y-2">
          <div className="flex gap-2 items-center">
            <span className="text-xs text-gray-500">🤖 Max:</span>
            <input
              type="number"
              min={auction.current_price + 1}
              max={currentTeam.budget_remaining}
              value={autobidMax}
              onChange={e => setAutobidMax(parseInt(e.target.value) || auction.current_price + 1)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
            />
            <button type="submit" disabled={isPending}
              className="text-white px-3 py-1.5 rounded-lg text-sm font-semibold"
              style={{ background: 'var(--boccea-gold)', color: '#7a4f00' }}>
              Salva
            </button>
            <button type="button" onClick={() => setShowAutobid(false)}
              className="px-2 py-1.5 text-gray-400 text-sm">✕</button>
          </div>
          <button type="button" onClick={handleRemoveAutobid} disabled={isPending}
            className="text-xs text-red-500 hover:underline">
            Rimuovi autobid
          </button>
        </form>
      )}

      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )
}
