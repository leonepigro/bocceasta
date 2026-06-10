'use server'
import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { login, fetchLeagues, getLeague } from './client'
import { revalidatePath } from 'next/cache'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'admin') throw new Error('Unauthorized')
}

function checkEnv() {
  const missing = ['FANTACALCIO_APP_KEY', 'FANTACALCIO_USERNAME', 'FANTACALCIO_PASSWORD']
    .filter(k => !process.env[k])
  if (missing.length) throw new Error(`Variabili mancanti: ${missing.join(', ')}`)
}

// Step 0: login + lista leghe
export async function loginAndGetLeagues() {
  await assertAdmin()
  try {
    checkEnv()
    const token = await login()
    const leagues = await fetchLeagues(token)
    return {
      success: true,
      token,
      leagues: leagues.map(l => ({ id: l.id, nome: l.nome, alias: l.alias, tipo: l.tipo })),
    }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Errore sconosciuto' }
  }
}

// Step 1: carica squadre di una lega selezionata
export async function syncFromFantacalcio(userToken: string, leagueAlias: string) {
  await assertAdmin()
  try {
    checkEnv()
    const { league, teams } = await getLeague(userToken, leagueAlias)
    return {
      success: true,
      league: { nome: league.nome, alias: league.alias, token: league.token, tipo: league.tipo },
      teams: teams.map(t => ({
        id: t.id,
        nome: t.nome,
        email: t.presidente?.email ?? null,
        calciatori: t.calciatori?.length ?? 0,
      })),
    }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Errore sconosciuto' }
  }
}

export async function pushRostersToFantacalcio(leagueAlias: string, leagueToken: string) {
  await assertAdmin()
  try {
    checkEnv()
    const service = await createServiceClient()
    const { data: sold, error } = await service
      .from('players')
      .select('id, sold_price, teams!players_sold_to_team_id_fkey(fc_team_id)')
      .eq('is_sold', true)
    if (error) return { error: error.message }
    if (!sold?.length) return { error: 'Nessun giocatore venduto da esportare' }

    const token = await login()
    const { buyPlayer } = await import('./client')
    let ok = 0
    const errors: string[] = []

    for (const p of sold) {
      const team = Array.isArray(p.teams) ? p.teams[0] : p.teams
      const fcTeamId = (team as { fc_team_id: number | null })?.fc_team_id
      if (!fcTeamId) { errors.push(`Giocatore ${p.id}: fc_team_id mancante`); continue }
      try {
        await buyPlayer(token, leagueAlias, leagueToken, fcTeamId, p.id, p.sold_price ?? 1)
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
