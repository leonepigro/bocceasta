'use server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

type WishlistConfig = {
  enabled: boolean
  maxTotal: number
  maxPerRole: Record<string, number>
  maxFvm: number  // 0 = no cap esplicito, usa media auto
}

async function getWishlistConfig(): Promise<WishlistConfig> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('config')
    .select('wishlist_enabled, wishlist_max_total, wishlist_max_per_role, wishlist_max_fvm')
    .eq('id', 1).maybeSingle()
  return {
    enabled: data?.wishlist_enabled ?? true,
    maxTotal: data?.wishlist_max_total ?? 30,
    maxPerRole: data?.wishlist_max_per_role ?? {},
    maxFvm: data?.wishlist_max_fvm ?? 0,
  }
}

export async function getWishlistConfigPublic(): Promise<WishlistConfig> {
  return getWishlistConfig()
}

export async function updateWishlistConfig(cfg: WishlistConfig) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'admin') return { error: 'Unauthorized' }
  const service = await createServiceClient()
  await service.from('config').update({
    wishlist_enabled: cfg.enabled,
    wishlist_max_total: cfg.maxTotal,
    wishlist_max_per_role: cfg.maxPerRole,
    wishlist_max_fvm: cfg.maxFvm,
  }).eq('id', 1)
  revalidatePath('/admin')
  revalidatePath('/preferiti')
  return { ok: true }
}

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

export async function togglePreference(playerId: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const teamId = await getMyTeamId()
  if (!teamId) return { error: 'No team' }

  const cfg = await getWishlistConfig()
  if (!cfg.enabled) return { error: 'Wishlist disabilitata' }

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
  }

  // Conta totali e per ruolo del player target
  const [{ count: total }, { data: player }, { data: currentPrefs }] = await Promise.all([
    supabase.from('team_preferences')
      .select('*', { count: 'exact', head: true }).eq('team_id', teamId),
    supabase.from('players')
      .select('id, roles, fvm').eq('id', playerId).single(),
    supabase.from('team_preferences')
      .select('player_id, players!inner(roles, fvm)')
      .eq('team_id', teamId),
  ])

  if ((total ?? 0) >= cfg.maxTotal) {
    return { error: `Limite wishlist raggiunto (${cfg.maxTotal} giocatori)` }
  }

  // Conta giocatori in wishlist con stesso ruolo primario
  const targetRole = player?.roles?.[0]
  if (targetRole && cfg.maxPerRole[targetRole] != null) {
    const sameRole = (currentPrefs ?? []).filter(p => {
      const roles = (p as unknown as { players: { roles: string[] } }).players?.roles
      return roles?.[0] === targetRole
    }).length
    if (sameRole >= cfg.maxPerRole[targetRole]) {
      return { error: `Limite per ruolo ${targetRole} raggiunto (${cfg.maxPerRole[targetRole]})` }
    }
  }

  // Cap Quotazione totale wishlist
  if (cfg.maxFvm > 0) {
    const currentSum = (currentPrefs ?? []).reduce((s, p) => {
      const f = (p as unknown as { players: { fvm: number | null } }).players?.fvm ?? 0
      return s + f
    }, 0)
    const newSum = currentSum + (player?.fvm ?? 0)
    if (newSum > cfg.maxFvm) {
      return { error: `Cap Quotazione superato (${newSum} / ${cfg.maxFvm} max)` }
    }
  }

  await supabase.from('team_preferences')
    .insert({ team_id: teamId, player_id: playerId })
  revalidatePath('/preferiti')
  return { added: true }
}

// Per il sorteggio: tutte le preferenze di tutti i team
export async function getAllPreferences(): Promise<{ team_id: string; player_id: number }[]> {
  const supabase = await createClient()
  const { data } = await supabase.from('team_preferences').select('team_id, player_id')
  return data ?? []
}

// Solo statistiche aggregate per admin. Nessun player_id, nessun nome giocatore.
// Garantisce che admin non possa sbirciare i preferiti degli altri.
export async function getWishlistStatsForAdmin(): Promise<{
  team_id: string
  team_name: string
  owner_name: string | null
  count: number
  fvm_total: number
}[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'admin') return []

  const service = await createServiceClient()
  const [{ data: teams }, { data: prefs }] = await Promise.all([
    service.from('teams').select('id, team_name, owner_name'),
    service.from('team_preferences').select('team_id, players!inner(fvm)'),
  ])

  const aggByTeam = new Map<string, { count: number; fvm_total: number }>()
  for (const row of prefs ?? []) {
    const tid = (row as unknown as { team_id: string }).team_id
    const fvm = (row as unknown as { players: { fvm: number | null } }).players?.fvm ?? 0
    const cur = aggByTeam.get(tid) ?? { count: 0, fvm_total: 0 }
    cur.count++
    cur.fvm_total += fvm
    aggByTeam.set(tid, cur)
  }

  return (teams ?? []).map(t => ({
    team_id: t.id,
    team_name: t.team_name,
    owner_name: t.owner_name,
    count: aggByTeam.get(t.id)?.count ?? 0,
    fvm_total: aggByTeam.get(t.id)?.fvm_total ?? 0,
  })).sort((a, b) => a.team_name.localeCompare(b.team_name))
}
