'use server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { DraftResult } from './generator'
import type { ApplyAssignment } from './actions'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'admin') throw new Error('Unauthorized')
}

export async function lockDraft(result: DraftResult, season: string) {
  await assertAdmin()
  const service = await createServiceClient()
  const { data, error } = await service
    .from('draft_sessions')
    .insert({ season, result, locked_at: new Date().toISOString() })
    .select('id')
    .single()
  if (error) return { error: error.message }
  return { id: data.id }
}

export async function applyLockedDraft(sessionId: string) {
  await assertAdmin()
  const service = await createServiceClient()

  const { data: session, error: fetchErr } = await service
    .from('draft_sessions')
    .select('result, locked_at, applied_at')
    .eq('id', sessionId)
    .single()

  if (fetchErr || !session) return { error: 'Sessione non trovata' }
  if (!session.locked_at) return { error: 'Sorteggio non bloccato' }
  if (session.applied_at) return { error: 'Già applicato' }

  const draft = session.result as DraftResult
  const assignments: ApplyAssignment[] = draft.assignments.flatMap(a =>
    a.players.map(p => ({ playerId: p.id, teamId: a.team.id, fvm: p.fvm }))
  )

  await service.from('players').update({ is_sold: false, sold_to_team_id: null, sold_price: null }).neq('id', 0)

  const errors: string[] = []
  for (const { playerId, teamId, fvm } of assignments) {
    const { error } = await service
      .from('players')
      .update({ is_sold: true, sold_to_team_id: teamId, sold_price: fvm ?? 1 })
      .eq('id', playerId)
    if (error) errors.push(`Player ${playerId}: ${error.message}`)
  }

  await service
    .from('draft_sessions')
    .update({ applied_at: new Date().toISOString() })
    .eq('id', sessionId)

  revalidatePath('/admin')
  revalidatePath('/dashboard')
  return { success: true, assigned: assignments.length, errors }
}

export async function getLatestLockedDraft() {
  const service = await createServiceClient()
  const { data } = await service
    .from('draft_sessions')
    .select('id, season, locked_at, applied_at')
    .not('locked_at', 'is', null)
    .order('locked_at', { ascending: false })
    .limit(1)
    .single()
  return data ?? null
}
