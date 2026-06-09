'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getTeamId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' as const, supabase, teamId: null }
  const { data: team } = await supabase.from('teams').select('id').eq('user_id', user.id).single()
  if (!team) return { error: 'Team not found' as const, supabase, teamId: null }
  return { error: null, supabase, teamId: team.id as string }
}

export async function launchAuction(playerId: number, initialBid: number) {
  const { error, supabase, teamId } = await getTeamId()
  if (error) return { error }

  const { data, error: rpcError } = await supabase.rpc('launch_auction', {
    p_player_id: playerId,
    p_team_id: teamId,
    p_initial_bid: initialBid,
  })

  if (rpcError) return { error: rpcError.message }
  revalidatePath('/dashboard')
  return { auctionId: data as string }
}

export async function placeBid(auctionId: string, amount: number) {
  const { error, supabase, teamId } = await getTeamId()
  if (error) return { error }

  const { error: rpcError } = await supabase.rpc('place_bid', {
    p_auction_id: auctionId,
    p_team_id: teamId,
    p_amount: amount,
  })

  if (rpcError) return { error: rpcError.message }
  return { success: true }
}

export async function setAutobid(auctionId: string, maxAmount: number) {
  const { error, supabase, teamId } = await getTeamId()
  if (error) return { error }

  const { error: rpcError } = await supabase.rpc('set_autobid', {
    p_auction_id: auctionId,
    p_team_id: teamId,
    p_max_amount: maxAmount,
  })

  if (rpcError) return { error: rpcError.message }
  return { success: true }
}

export async function removeAutobid(auctionId: string) {
  const { error, supabase, teamId } = await getTeamId()
  if (error) return { error }

  const { error: rpcError } = await supabase.rpc('remove_autobid', {
    p_auction_id: auctionId,
    p_team_id: teamId,
  })

  if (rpcError) return { error: rpcError.message }
  return { success: true }
}
