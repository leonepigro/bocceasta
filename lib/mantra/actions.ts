'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getTeamId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non autenticato')
  const { data: team } = await supabase.from('teams').select('id').eq('user_id', user.id).single()
  if (!team) throw new Error('Squadra non trovata')
  return { supabase, teamId: team.id }
}

export async function addTarget(playerId: number, maxPrice: number) {
  try {
    const { supabase, teamId } = await getTeamId()
    const { error } = await supabase
      .from('targets')
      .upsert({ team_id: teamId, player_id: playerId, max_price: maxPrice }, { onConflict: 'team_id,player_id' })
    if (error) return { error: error.message }
    revalidatePath('/planner')
    return { success: true }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Errore' }
  }
}

export async function removeTarget(playerId: number) {
  try {
    const { supabase, teamId } = await getTeamId()
    const { error } = await supabase
      .from('targets')
      .delete()
      .eq('team_id', teamId)
      .eq('player_id', playerId)
    if (error) return { error: error.message }
    revalidatePath('/planner')
    return { success: true }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Errore' }
  }
}

export async function updateTargetPrice(playerId: number, maxPrice: number) {
  try {
    const { supabase, teamId } = await getTeamId()
    const { error } = await supabase
      .from('targets')
      .update({ max_price: maxPrice })
      .eq('team_id', teamId)
      .eq('player_id', playerId)
    if (error) return { error: error.message }
    revalidatePath('/planner')
    return { success: true }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Errore' }
  }
}
