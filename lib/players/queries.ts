import type { SupabaseClient } from '@supabase/supabase-js'
import type { Player } from '@/lib/supabase/types'

export async function searchAvailablePlayers(
  supabase: SupabaseClient,
  query: string,
  enabledRoles: string[]
): Promise<Player[]> {
  if (!query || query.length < 2) return []

  const { data } = await supabase
    .from('players')
    .select('*')
    .eq('is_sold', false)
    .ilike('name', `%${query}%`)
    .overlaps('roles', enabledRoles)
    .limit(10)

  return (data as Player[]) ?? []
}
