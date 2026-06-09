import type { AuctionStatus } from '@/lib/supabase/types'

type ValidationResult = { valid: true } | { valid: false; error: string }

export function validateLaunchAuction(params: {
  playerRoles: string[]
  enabledRoles: string[]
  isPlayerSold: boolean
  isPlayerInActiveAuction: boolean
  teamActiveAuctions: number
  totalActiveAuctions: number
  maxPerTeam: number
  maxTotal: number
  initialBid: number
  teamBudget: number
}): ValidationResult {
  if (params.isPlayerSold) return { valid: false, error: 'Player already sold' }
  if (params.isPlayerInActiveAuction) return { valid: false, error: 'Player already in active auction' }
  if (!params.playerRoles.some(r => params.enabledRoles.includes(r)))
    return { valid: false, error: 'Player role not enabled for auction' }
  if (params.teamActiveAuctions >= params.maxPerTeam)
    return { valid: false, error: 'Team max active auctions reached' }
  if (params.totalActiveAuctions >= params.maxTotal)
    return { valid: false, error: 'Total max active auctions reached' }
  if (params.initialBid < 1) return { valid: false, error: 'Initial bid must be at least 1' }
  if (params.teamBudget < params.initialBid) return { valid: false, error: 'Insufficient budget' }
  return { valid: true }
}

export function validateBid(params: {
  amount: number
  currentPrice: number
  teamBudget: number
  auctionStatus: AuctionStatus
  auctionExpiresAt: Date
  isCurrentWinner: boolean
}): ValidationResult {
  if (params.auctionStatus !== 'active') return { valid: false, error: 'Auction is not active' }
  if (params.auctionExpiresAt <= new Date()) return { valid: false, error: 'Auction has expired' }
  if (params.amount <= params.currentPrice)
    return { valid: false, error: 'Bid must be greater than current price' }
  if (params.isCurrentWinner) return { valid: false, error: 'You are already the highest bidder (winner)' }
  if (params.teamBudget < params.amount) return { valid: false, error: 'Insufficient budget' }
  return { valid: true }
}
