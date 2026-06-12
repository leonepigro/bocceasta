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

  // Try to find existing user first
  const { data: existingUsers } = await service.auth.admin.listUsers()
  const existingUser = existingUsers?.users?.find(u => u.email === email)

  let userId: string

  if (existingUser) {
    userId = existingUser.id
  } else {
    const { data: authData, error: authError } = await service.auth.admin.createUser({
      email,
      password,
      user_metadata: { role: 'user' },
      email_confirm: true,
    })
    if (authError) return { error: authError.message }
    userId = authData.user.id
  }

  const { error: teamError } = await service.from('teams').insert({
    user_id: userId,
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

export async function updateTeamInfo(teamId: string, teamName: string, ownerName: string) {
  const service = await assertAdmin()
  const { error } = await service.from('teams').update({ team_name: teamName, owner_name: ownerName }).eq('id', teamId)
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { success: true }
}

export async function getTeamEmail(teamId: string): Promise<{ email: string | null; error?: string }> {
  const service = await assertAdmin()
  const { data: team, error } = await service.from('teams').select('user_id').eq('id', teamId).single()
  if (error || !team?.user_id) return { email: null, error: error?.message }
  const { data, error: authErr } = await service.auth.admin.getUserById(team.user_id)
  if (authErr) return { email: null, error: authErr.message }
  return { email: data.user?.email ?? null }
}

export async function updateTeamEmail(teamId: string, newEmail: string) {
  const service = await assertAdmin()
  const { data: team, error } = await service.from('teams').select('user_id').eq('id', teamId).single()
  if (error || !team?.user_id) return { error: 'Team o utente non trovato' }
  const { error: authErr } = await service.auth.admin.updateUserById(team.user_id, {
    email: newEmail,
    email_confirm: true,
  })
  if (authErr) return { error: authErr.message }
  revalidatePath('/admin')
  return { success: true }
}

export async function resetTeamPassword(teamId: string, newPassword: string) {
  const service = await assertAdmin()
  if (!newPassword || newPassword.length < 6) return { error: 'Password min 6 caratteri' }
  const { data: team, error } = await service.from('teams').select('user_id').eq('id', teamId).single()
  if (error || !team?.user_id) return { error: 'Team o utente non trovato' }
  const { error: authErr } = await service.auth.admin.updateUserById(team.user_id, {
    password: newPassword,
  })
  if (authErr) return { error: authErr.message }
  revalidatePath('/admin')
  return { success: true }
}

// Self-service: utente cambia la propria password
export async function changeMyPassword(newPassword: string) {
  if (!newPassword || newPassword.length < 6) return { error: 'Password min 6 caratteri' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autenticato' }
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { error: error.message }
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
