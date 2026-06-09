import { describe, it, expect } from 'vitest'
import { validateLaunchAuction, validateBid } from '@/lib/auction/validation'

describe('validateLaunchAuction', () => {
  const base = {
    playerRoles: ['Por'],
    enabledRoles: ['Por'],
    isPlayerSold: false,
    isPlayerInActiveAuction: false,
    teamActiveAuctions: 0,
    totalActiveAuctions: 0,
    maxPerTeam: 2,
    maxTotal: 10,
    initialBid: 1,
    teamBudget: 500,
  }

  it('accepts valid launch', () => {
    expect(validateLaunchAuction(base)).toEqual({ valid: true })
  })

  it('rejects if player sold', () => {
    const r = validateLaunchAuction({ ...base, isPlayerSold: true })
    expect(r.valid).toBe(false)
    expect((r as { valid: false; error: string }).error).toMatch(/sold/i)
  })

  it('rejects if player role not enabled', () => {
    const r = validateLaunchAuction({ ...base, playerRoles: ['Dc'], enabledRoles: ['Por'] })
    expect(r.valid).toBe(false)
    expect((r as { valid: false; error: string }).error).toMatch(/role/i)
  })

  it('rejects if team at max active auctions', () => {
    const r = validateLaunchAuction({ ...base, teamActiveAuctions: 2, maxPerTeam: 2 })
    expect(r.valid).toBe(false)
    expect((r as { valid: false; error: string }).error).toMatch(/team/i)
  })

  it('rejects if total at max active auctions', () => {
    const r = validateLaunchAuction({ ...base, totalActiveAuctions: 10, maxTotal: 10 })
    expect(r.valid).toBe(false)
    expect((r as { valid: false; error: string }).error).toMatch(/total/i)
  })

  it('rejects if insufficient budget', () => {
    const r = validateLaunchAuction({ ...base, initialBid: 50, teamBudget: 30 })
    expect(r.valid).toBe(false)
    expect((r as { valid: false; error: string }).error).toMatch(/budget/i)
  })

  it('rejects bid below 1', () => {
    const r = validateLaunchAuction({ ...base, initialBid: 0 })
    expect(r.valid).toBe(false)
  })

  it('rejects if player already in active auction', () => {
    const r = validateLaunchAuction({ ...base, isPlayerInActiveAuction: true })
    expect(r.valid).toBe(false)
    expect((r as { valid: false; error: string }).error).toMatch(/auction/i)
  })
})

describe('validateBid', () => {
  const futureDate = new Date(Date.now() + 3600_000)
  const base = {
    amount: 10,
    currentPrice: 5,
    teamBudget: 500,
    auctionStatus: 'active' as const,
    auctionExpiresAt: futureDate,
    isCurrentWinner: false,
  }

  it('accepts valid bid', () => {
    expect(validateBid(base)).toEqual({ valid: true })
  })

  it('rejects if auction not active', () => {
    const r = validateBid({ ...base, auctionStatus: 'sold' as const })
    expect(r.valid).toBe(false)
    expect((r as { valid: false; error: string }).error).toMatch(/active/i)
  })

  it('rejects if auction expired', () => {
    const r = validateBid({ ...base, auctionExpiresAt: new Date(Date.now() - 1000) })
    expect(r.valid).toBe(false)
    expect((r as { valid: false; error: string }).error).toMatch(/expir/i)
  })

  it('rejects if bid not greater than current price', () => {
    const r = validateBid({ ...base, amount: 5 })
    expect(r.valid).toBe(false)
    expect((r as { valid: false; error: string }).error).toMatch(/greater/i)
  })

  it('rejects if insufficient budget', () => {
    const r = validateBid({ ...base, amount: 100, teamBudget: 50 })
    expect(r.valid).toBe(false)
    expect((r as { valid: false; error: string }).error).toMatch(/budget/i)
  })

  it('rejects if already the winner', () => {
    const r = validateBid({ ...base, isCurrentWinner: true })
    expect(r.valid).toBe(false)
    expect((r as { valid: false; error: string }).error).toMatch(/winner/i)
  })
})
