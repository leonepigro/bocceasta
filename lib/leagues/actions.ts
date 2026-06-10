'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { parseRosterCsv } from './parser'

async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non autenticato')
  return { supabase, user }
}

export async function listMyLeagues() {
  try {
    const { supabase, user } = await getUser()
    const { data, error } = await supabase
      .from('my_leagues')
      .select('id, name, csv_team_name, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (error) return { error: error.message }
    return { leagues: data ?? [] }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Errore' }
  }
}

export async function importLeague(csvText: string, leagueName: string, csvTeamName: string) {
  try {
    const { supabase, user } = await getUser()

    // Parsa CSV
    const teamsMap = parseRosterCsv(csvText)
    const playerIds = teamsMap.get(csvTeamName)
    if (!playerIds?.length) return { error: `Team "${csvTeamName}" non trovato nel CSV` }

    // Verifica quanti player ID esistono nel DB
    const { data: existingPlayers } = await supabase
      .from('players')
      .select('id')
      .in('id', playerIds)

    const foundIds = new Set((existingPlayers ?? []).map(p => p.id))
    const missing = playerIds.filter(id => !foundIds.has(id))

    // Crea lega
    const { data: league, error: leagueErr } = await supabase
      .from('my_leagues')
      .insert({ user_id: user.id, name: leagueName, csv_team_name: csvTeamName })
      .select('id')
      .single()
    if (leagueErr) return { error: leagueErr.message }

    // Inserisci giocatori trovati
    const rows = Array.from(foundIds).map(pid => ({ league_id: league.id, player_id: pid }))
    if (rows.length) {
      const { error: insertErr } = await supabase.from('my_league_players').insert(rows)
      if (insertErr) return { error: insertErr.message }
    }

    revalidatePath('/planner')
    return {
      success: true,
      leagueId: league.id,
      imported: rows.length,
      missing: missing.length,
      missingIds: missing,
    }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Errore' }
  }
}

export async function deleteLeague(leagueId: string) {
  try {
    const { supabase, user } = await getUser()
    const { error } = await supabase
      .from('my_leagues')
      .delete()
      .eq('id', leagueId)
      .eq('user_id', user.id)
    if (error) return { error: error.message }
    revalidatePath('/planner')
    return { success: true }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Errore' }
  }
}
