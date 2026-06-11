'use server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type ApplyAssignment = {
  playerId: number
  teamId: string
}

export async function applyDraft(assignments: ApplyAssignment[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'admin') return { error: 'Unauthorized' }

  const service = await createServiceClient()

  // Reset giocatori precedentemente assegnati
  await service.from('players').update({ is_sold: false, sold_to_team_id: null, sold_price: null }).neq('id', 0)

  // Applica nuove assegnazioni in batch
  const errors: string[] = []
  for (let i = 0; i < assignments.length; i += 100) {
    const batch = assignments.slice(i, i + 100)
    for (const { playerId, teamId } of batch) {
      const { error } = await service
        .from('players')
        .update({ is_sold: true, sold_to_team_id: teamId, sold_price: 1 })
        .eq('id', playerId)
      if (error) errors.push(`Player ${playerId}: ${error.message}`)
    }
  }

  revalidatePath('/admin')
  revalidatePath('/dashboard')
  return { success: true, assigned: assignments.length, errors }
}
