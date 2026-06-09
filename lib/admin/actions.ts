'use server'
import { createServiceClient, createClient } from '@/lib/supabase/server'
import type { Config } from '@/lib/supabase/types'
import { revalidatePath } from 'next/cache'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'admin') throw new Error('Unauthorized')
  return createServiceClient()
}

export async function updateEnabledRoles(roles: string[]) {
  const service = await assertAdmin()
  await service.from('config').update({ enabled_roles: roles }).eq('id', 1)
  revalidatePath('/dashboard')
  revalidatePath('/admin')
}

export async function updateConfig(cfg: Config) {
  const service = await assertAdmin()
  const { enabled_roles: _er, id: _id, ...updates } = cfg
  await service.from('config').update(updates).eq('id', 1)
  revalidatePath('/admin')
}

export async function adminCancelAuction(auctionId: string) {
  const service = await assertAdmin()
  const { error } = await service.rpc('cancel_auction', { p_auction_id: auctionId })
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { success: true }
}

export async function createTeam(teamName: string, ownerName: string, email: string, password: string) {
  const service = await assertAdmin()
  const { data: authData, error: authError } = await service.auth.admin.createUser({
    email,
    password,
    user_metadata: { role: 'user' },
    email_confirm: true,
  })
  if (authError) return { error: authError.message }

  const { error: teamError } = await service.from('teams').insert({
    user_id: authData.user.id,
    team_name: teamName,
    owner_name: ownerName,
  })
  if (teamError) return { error: teamError.message }
  revalidatePath('/admin')
  return { success: true }
}

export async function updateTeamBudget(teamId: string, newBudget: number) {
  const service = await assertAdmin()
  const { error } = await service.from('teams').update({ budget_remaining: newBudget }).eq('id', teamId)
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { success: true }
}

export async function getExportData() {
  const service = await assertAdmin()
  const { data, error } = await service
    .from('players')
    .select('*, teams!players_sold_to_team_id_fkey(team_name)')
    .eq('is_sold', true)
  if (error) return { error: error.message }
  return { data }
}
