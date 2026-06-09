'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function launchAuction(playerId: number, initialBid: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: team } = await supabase
    .from('teams')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!team) return { error: 'Team not found for user' }

  const { data, error } = await supabase.rpc('launch_auction', {
    p_player_id: playerId,
    p_team_id: team.id,
    p_initial_bid: initialBid,
  })

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return { auctionId: data as string }
}

export async function placeBid(auctionId: string, amount: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: team } = await supabase
    .from('teams')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!team) return { error: 'Team not found for user' }

  const { error } = await supabase.rpc('place_bid', {
    p_auction_id: auctionId,
    p_team_id: team.id,
    p_amount: amount,
  })

  if (error) return { error: error.message }
  return { success: true }
}
