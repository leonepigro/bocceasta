'use server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { generateDraft } from './generator'
import type { DraftResult } from './generator'
import type { ApplyAssignment } from './actions'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'admin') throw new Error('Unauthorized')
}

// Programma un sorteggio futuro
export async function scheduleDraft(season: string, hoursFromNow: number) {
  await assertAdmin()
  const service = await createServiceClient()
  const scheduledAt = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString()
  const { data, error } = await service
    .from('draft_sessions')
    .insert({ season, scheduled_at: scheduledAt })
    .select('id')
    .single()
  if (error) return { error: error.message }
  return { id: data.id, scheduled_at: scheduledAt }
}

// Esegue il sorteggio allo scadere del timer — atomico, una sola volta
export async function executeScheduledDraft(sessionId: string) {
  const service = await createServiceClient()

  // Fetch session
  const { data: session, error } = await service
    .from('draft_sessions')
    .select('id, scheduled_at, locked_at, result')
    .eq('id', sessionId)
    .single()

  if (error || !session) return { error: 'Sessione non trovata' }
  if (session.locked_at) return { alreadyDone: true, result: session.result as DraftResult }
  if (!session.scheduled_at) return { error: 'Nessun timer impostato' }
  if (new Date(session.scheduled_at) > new Date()) return { notYet: true }

  // Fetch teams, players e preferenze wishlist
  const [{ data: teams }, { data: players }, { data: preferences }] = await Promise.all([
    service.from('teams').select('*').order('team_name'),
    service.from('players').select('id, name, roles, fvm, serie_a_team'),
    service.from('team_preferences').select('team_id, player_id'),
  ])

  if (!teams?.length) return { error: 'Nessuna squadra trovata' }
  if (!players?.length) return { error: 'Nessun giocatore trovato' }

  // Genera e blocca in un colpo solo (nessun preview)
  const result = generateDraft(
    teams,
    players as Parameters<typeof generateDraft>[1],
    preferences ?? []
  )
  const lockedAt = new Date().toISOString()

  const { error: updateErr } = await service
    .from('draft_sessions')
    .update({ result, locked_at: lockedAt })
    .eq('id', sessionId)
    .is('locked_at', null)  // evita doppia scrittura in race condition

  if (updateErr) return { error: updateErr.message }

  revalidatePath(`/sorteggio/${sessionId}`)
  return { done: true, result, locked_at: lockedAt }
}

// Reset + apply in batch — chiamata iniziale: resetta tutti e restituisce il totale
export async function startApplyDraft(sessionId: string) {
  await assertAdmin()
  const service = await createServiceClient()

  const { data: session, error: fetchErr } = await service
    .from('draft_sessions')
    .select('result, locked_at, applied_at')
    .eq('id', sessionId)
    .single()

  if (fetchErr || !session) return { error: 'Sessione non trovata' }
  if (!session.locked_at) return { error: 'Sorteggio non ancora eseguito' }
  if (session.applied_at) return { error: 'Già applicato' }

  // Reset
  await service.from('players')
    .update({ is_sold: false, sold_to_team_id: null, sold_price: null })
    .neq('id', 0)

  const draft = session.result as DraftResult
  const total = draft.assignments.reduce((s, a) => s + a.players.length, 0)
  return { success: true, total }
}

// Applica un batch di N giocatori per sessionId
export async function applyDraftBatch(
  sessionId: string,
  batch: ApplyAssignment[]
) {
  await assertAdmin()
  const service = await createServiceClient()
  const errors: string[] = []

  for (const { playerId, teamId, fvm } of batch) {
    const { error } = await service.from('players')
      .update({ is_sold: true, sold_to_team_id: teamId, sold_price: fvm ?? 1 })
      .eq('id', playerId)
    if (error) errors.push(`${playerId}`)
  }
  return { done: batch.length, errors }
}

// Reset totale rose: rimuove tutte le assegnazioni dei giocatori.
// Marca anche tutti i draft_sessions applicati come "non applicati" non si fa,
// solo i players vengono ripuliti — la storia draft_sessions resta intatta.
export async function resetAllRosters() {
  await assertAdmin()
  const service = await createServiceClient()
  const { error } = await service
    .from('players')
    .update({ is_sold: false, sold_to_team_id: null, sold_price: null })
    .neq('id', 0)
  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  revalidatePath('/admin')
  return { ok: true }
}

// Marca la sessione come applicata
export async function finalizeDraftApply(sessionId: string) {
  await assertAdmin()
  const service = await createServiceClient()
  await service.from('draft_sessions')
    .update({ applied_at: new Date().toISOString() })
    .eq('id', sessionId)
  revalidatePath('/admin')
  revalidatePath('/dashboard')
  return { success: true }
}

// Usato dall'admin per vedere sessioni schedulate/bloccate
export async function listDraftSessions() {
  await assertAdmin()
  const service = await createServiceClient()
  const { data } = await service
    .from('draft_sessions')
    .select('id, season, scheduled_at, locked_at, applied_at')
    .order('created_at', { ascending: false })
    .limit(10)
  return data ?? []
}
