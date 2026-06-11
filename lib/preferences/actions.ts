'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getMyTeamId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('teams').select('id').eq('user_id', user.id).maybeSingle()
  return data?.id ?? null
}

export async function getMyPreferences(): Promise<number[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const teamId = await getMyTeamId()
  if (!teamId) return []
  const { data } = await supabase
    .from('team_preferences')
    .select('player_id')
    .eq('team_id', teamId)
  return (data ?? []).map(r => r.player_id)
}

const MAX_WISHLIST_SIZE = 30

export async function togglePreference(playerId: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const teamId = await getMyTeamId()
  if (!teamId) return { error: 'No team' }

  const { data: existing } = await supabase
    .from('team_preferences')
    .select('player_id')
    .eq('team_id', teamId)
    .eq('player_id', playerId)
    .maybeSingle()

  if (existing) {
    await supabase.from('team_preferences')
      .delete().eq('team_id', teamId).eq('player_id', playerId)
    revalidatePath('/preferiti')
    return { added: false }
  } else {
    // Limite 30 wishlist
    const { count } = await supabase
      .from('team_preferences')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId)
    if ((count ?? 0) >= MAX_WISHLIST_SIZE) {
      return { error: `Limite wishlist raggiunto (${MAX_WISHLIST_SIZE} giocatori)` }
    }
    await supabase.from('team_preferences')
      .insert({ team_id: teamId, player_id: playerId })
    revalidatePath('/preferiti')
    return { added: true }
  }
}

// Per il sorteggio: tutte le preferenze di tutti i team
export async function getAllPreferences(): Promise<{ team_id: string; player_id: number }[]> {
  const supabase = await createClient()
  const { data } = await supabase.from('team_preferences').select('team_id, player_id')
  return data ?? []
}
