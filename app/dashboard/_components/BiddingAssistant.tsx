'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { launchAuction } from '@/lib/auction/actions'
import type { AuctionWithPlayer, Team } from '@/lib/supabase/types'

type PlayerRow = {
  id: number
  name: string
  roles: string[]
  serie_a_team: string | null
  fvm: number | null
  is_sold: boolean
  in_active_auction: boolean
  auction_price: number | null
  auction_winner_team: string | null
}

type Props = {
  currentTeam: Team
  rosterCount: number
  players: PlayerRow[]
  auctions: AuctionWithPlayer[]
  enabledRoles: string[]
}

const ROSTER_TARGET = 27
const ROSTER_MIN = 25
const ROSTER_MAX = 28
const BUDGET_TOTAL = 500

function valueColor(ratio: number | null) {
  if (ratio === null) return 'text-gray-400'
  if (ratio < 0.5) return 'text-green-600'
  if (ratio < 0.8) return 'text-amber-600'
  return 'text-red-600'
}

function valueBg(ratio: number | null) {
  if (ratio === null) return 'bg-gray-50'
  if (ratio < 0.5) return 'bg-green-50'
  if (ratio < 0.8) return 'bg-amber-50'
  return 'bg-red-50'
}

function LaunchQuick({ player, budget, onDone }: { player: PlayerRow; budget: number; onDone: () => void }) {
  const [bid, setBid] = useState(1)
  const [err, setErr] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    startTransition(async () => {
      const r = await launchAuction(player.id, bid)
      if (r.error) setErr(r.error)
      else { onDone(); router.refresh() }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-1 items-center mt-1">
      <input type="number" min={1} max={budget} value={bid}
        onChange={e => setBid(parseInt(e.target.value) || 1)}
        className="w-14 border border-gray-200 rounded px-2 py-1 text-xs" autoFocus />
      <span className="text-xs text-gray-400">cr</span>
      <button type="submit" disabled={isPending}
        className="text-white px-2 py-1 rounded text-xs font-semibold"
        style={{ background: 'var(--boccea-red)' }}>
        {isPending ? '...' : 'Lancia'}
      </button>
      <button type="button" onClick={onDone} className="text-gray-400 text-xs">✕</button>
      {err && <span className="text-red-500 text-xs">{err}</span>}
    </form>
  )
}

export function BiddingAssistant({ currentTeam, rosterCount, players, auctions, enabledRoles }: Props) {
  const [open, setOpen] = useState(true)
  const [launchingId, setLaunchingId] = useState<number | null>(null)

  const budget = currentTeam.budget_remaining
  const slotsRemaining = Math.max(0, ROSTER_TARGET - rosterCount)
  const minToKeep = Math.max(0, slotsRemaining - 1)
  const maxSpendNow = Math.max(0, budget - minToKeep)
  const avgPerSlot = slotsRemaining > 0 ? Math.floor(budget / slotsRemaining) : 0
  const budgetPct = Math.round((budget / BUDGET_TOTAL) * 100)

  // Aste attive con ratio valore
  const auctionRadar = auctions
    .map(a => ({
      ...a,
      ratio: a.players.fvm && a.players.fvm > 0 ? a.current_price / a.players.fvm : null,
      isWinning: a.current_winner_team_id === currentTeam.id,
    }))
    .sort((a, b) => {
      if (a.ratio === null && b.ratio === null) return 0
      if (a.ratio === null) return 1
      if (b.ratio === null) return -1
      return a.ratio - b.ratio
    })

  // Top svincolati con FVM, solo ruoli abilitati
  const topFree = players
    .filter(p => !p.is_sold && !p.in_active_auction && p.fvm !== null &&
      (enabledRoles.length === 0 || p.roles.some(r => enabledRoles.includes(r))))
    .sort((a, b) => (b.fvm ?? 0) - (a.fvm ?? 0))
    .slice(0, 20)

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="w-full bg-white rounded-xl shadow-sm px-4 py-3 text-left text-sm font-medium text-gray-600 flex justify-between items-center">
        🎯 Assistente asta
        <span className="text-xs text-gray-400">▼ apri</span>
      </button>
    )
  }

  return (
    <section className="bg-white rounded-xl shadow-sm p-4 space-y-5">
      <div className="flex justify-between items-center">
        <h2 className="font-semibold text-sm" style={{ color: 'var(--boccea-red)' }}>🎯 Assistente asta</h2>
        <button onClick={() => setOpen(false)} className="text-xs text-gray-400 hover:text-gray-600">▲ chiudi</button>
      </div>

      {/* ── 1. Budget Gauge ── */}
      <div className="rounded-lg p-3 space-y-2" style={{ background: 'var(--boccea-gold-light)' }}>
        <div className="flex justify-between items-end">
          <div>
            <p className="text-2xl font-bold" style={{ color: '#7a4f00' }}>{budget} cr</p>
            <p className="text-xs text-amber-700">rimasti su {BUDGET_TOTAL}</p>
          </div>
          <div className="text-right text-xs text-amber-800 space-y-0.5">
            <p>Rosa: <strong>{rosterCount}</strong> / {ROSTER_MIN}–{ROSTER_MAX}</p>
            <p>Slot da riempire: <strong>{slotsRemaining}</strong></p>
          </div>
        </div>

        {/* Barra budget */}
        <div className="h-2 bg-amber-200 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all"
            style={{ width: `${budgetPct}%`, background: 'var(--boccea-red)' }} />
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs text-center">
          <div className="bg-white/60 rounded p-1.5">
            <p className="font-bold text-base" style={{ color: 'var(--boccea-red)' }}>{maxSpendNow}</p>
            <p className="text-amber-700">max ora</p>
          </div>
          <div className="bg-white/60 rounded p-1.5">
            <p className="font-bold text-base text-amber-800">{avgPerSlot}</p>
            <p className="text-amber-700">media/slot</p>
          </div>
          <div className="bg-white/60 rounded p-1.5">
            <p className="font-bold text-base text-amber-800">{minToKeep}</p>
            <p className="text-amber-700">min da tenere</p>
          </div>
        </div>
      </div>

      {/* ── 2. Radar aste attive ── */}
      {auctionRadar.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Aste in corso — ordinate per valore
          </h3>
          <ul className="space-y-1">
            {auctionRadar.map(a => (
              <li key={a.id}
                className={`rounded-lg px-3 py-2 flex items-center justify-between gap-2 ${valueBg(a.ratio)}`}>
                <div className="min-w-0">
                  <span className="font-medium text-sm">{a.players.name}</span>
                  <span className="text-xs text-gray-500 ml-1">{a.players.roles.join('/')}</span>
                </div>
                <div className="shrink-0 text-right text-xs space-y-0.5">
                  <div className="flex items-center gap-1.5 justify-end">
                    <span className="font-bold">{a.current_price} cr</span>
                    {a.players.fvm && <span className="text-gray-400">/ FVM {a.players.fvm}</span>}
                    {a.ratio !== null && (
                      <span className={`font-bold ${valueColor(a.ratio)}`}>
                        {Math.round(a.ratio * 100)}%
                      </span>
                    )}
                  </div>
                  {a.isWinning ? (
                    <span className="text-amber-700 font-medium">★ tu stai vincendo</span>
                  ) : a.teams_winner ? (
                    <span className="text-gray-400">{a.teams_winner.team_name}</span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-400 mt-1">
            🟢 &lt;50% FVM ottimo · 🟡 50–80% buono · 🔴 &gt;80% caro
          </p>
        </div>
      )}

      {/* ── 3. Top svincolati ── */}
      {topFree.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Top svincolati per FVM {enabledRoles.length > 0 ? `(${enabledRoles.join(', ')})` : ''}
          </h3>
          <ul className="divide-y divide-gray-50">
            {topFree.map(p => (
              <li key={p.id} className="py-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-medium text-sm">{p.name}</span>
                    {p.fvm && p.fvm > 20 && (
                      <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full text-green-700 bg-green-50 font-medium">
                        top
                      </span>
                    )}
                    <div className="text-xs text-gray-400">
                      <span className="font-mono">{p.roles.join('/')}</span>
                      {p.serie_a_team && <span className="ml-1">· {p.serie_a_team}</span>}
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    {p.fvm && (
                      <span className="text-sm font-bold" style={{ color: 'var(--boccea-red)' }}>
                        FVM {p.fvm}
                      </span>
                    )}
                    {launchingId !== p.id && (
                      <button onClick={() => setLaunchingId(p.id)}
                        className="text-xs px-2 py-1 rounded border font-medium"
                        style={{ borderColor: 'var(--boccea-red)', color: 'var(--boccea-red)' }}>
                        Lancia
                      </button>
                    )}
                  </div>
                </div>
                {launchingId === p.id && (
                  <LaunchQuick player={p} budget={maxSpendNow}
                    onDone={() => setLaunchingId(null)} />
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {auctionRadar.length === 0 && topFree.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-2">
          Nessuna asta attiva e nessun giocatore disponibile con i ruoli abilitati.
        </p>
      )}
    </section>
  )
}
