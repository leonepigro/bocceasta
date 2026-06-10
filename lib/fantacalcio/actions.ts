'use server'
import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { login, getLeague } from './client'
import { revalidatePath } from 'next/cache'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'admin') throw new Error('Unauthorized')
}

export async function syncFromFantacalcio() {
  await assertAdmin()

  const missing = ['FANTACALCIO_APP_KEY', 'FANTACALCIO_USERNAME', 'FANTACALCIO_PASSWORD']
    .filter(k => !process.env[k])
  if (missing.length) return { error: `Variabili mancanti: ${missing.join(', ')}` }

  try {
    const token = await login()
    const { league, teams, participants } = await getLeague(token)

    return {
      success: true,
      league: { nome: league.nome, alias: league.alias, tipo: league.tipo },
      teams: teams.map(t => ({
        id: t.id,
        nome: t.nome,
        email: t.presidente?.email ?? null,
        calciatori: t.calciatori?.length ?? 0,
      })),
      participants: participants.map(p => ({
        id: p.id,
        username: p.username,
        email: p.email,
        ruolo: p.ruolo,
      })),
    }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Errore sconosciuto' }
  }
}

export async function pushRostersToFantacalcio() {
  await assertAdmin()

  const missing = ['FANTACALCIO_APP_KEY', 'FANTACALCIO_USERNAME', 'FANTACALCIO_PASSWORD']
    .filter(k => !process.env[k])
  if (missing.length) return { error: `Variabili mancanti: ${missing.join(', ')}` }

  try {
    const service = await createServiceClient()

    // Giocatori venduti con squadra e team fantacalcio id
    const { data: sold, error } = await service
      .from('players')
      .select('id, sold_price, teams!players_sold_to_team_id_fkey(fc_team_id)')
      .eq('is_sold', true)
    if (error) return { error: error.message }
    if (!sold?.length) return { error: 'Nessun giocatore venduto da esportare' }

    const token = await login()
    const { league } = await getLeague(token)

    const { buyPlayer } = await import('./client')
    let ok = 0
    const errors: string[] = []

    for (const p of sold) {
      const team = Array.isArray(p.teams) ? p.teams[0] : p.teams
      const fcTeamId = (team as { fc_team_id: number | null })?.fc_team_id
      if (!fcTeamId) { errors.push(`Giocatore ${p.id}: fc_team_id mancante`); continue }
      try {
        await buyPlayer(token, league.alias, league.token, fcTeamId, p.id, p.sold_price ?? 1)
        ok++
      } catch (e: unknown) {
        errors.push(`Giocatore ${p.id}: ${e instanceof Error ? e.message : 'errore'}`)
      }
    }

    revalidatePath('/admin')
    return { success: true, pushed: ok, errors }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Errore sconosciuto' }
  }
}

export async function saveFcTeamMapping(mappings: { teamId: string; fcTeamId: number }[]) {
  await assertAdmin()
  const service = await createServiceClient()

  for (const m of mappings) {
    await service.from('teams').update({ fc_team_id: m.fcTeamId }).eq('id', m.teamId)
  }
  revalidatePath('/admin')
  return { success: true }
}
