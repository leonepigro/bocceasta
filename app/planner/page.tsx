import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { FormationAnalysis } from './_components/FormationAnalysis'
import { BudgetPlanner } from './_components/BudgetPlanner'
import { TargetList } from './_components/TargetList'
import { PlannerClient } from './_components/PlannerClient'

export default async function PlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ league?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: team } = await supabase
    .from('teams')
    .select('*')
    .eq('user_id', user.id)
    .single()

  // Leghe dell'utente
  const { data: leagues } = await supabase
    .from('my_leagues')
    .select('id, name, csv_team_name, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const params = await searchParams
  const selectedLeagueId = params.league ?? leagues?.[0]?.id ?? null

  // Giocatori della lega selezionata
  let leaguePlayers: { id: number; name: string; roles: string[]; fvm: number | null }[] = []
  if (selectedLeagueId) {
    const { data: lp } = await supabase
      .from('my_league_players')
      .select('players(id, name, roles, fvm)')
      .eq('league_id', selectedLeagueId)
    leaguePlayers = (lp ?? [])
      .map(r => {
        const p = Array.isArray(r.players) ? r.players[0] : r.players
        return p ? { id: p.id, name: p.name, roles: p.roles ?? [], fvm: p.fvm } : null
      })
      .filter(Boolean) as typeof leaguePlayers
  }

  // Tutti i giocatori liberi (non in nessuna my_league_players per la lega selezionata)
  const { data: allPlayersRaw } = await supabase
    .from('players')
    .select('id, name, serie_a_team, roles, fvm, is_sold')
    .order('name')

  const { data: activeAuctions } = await supabase
    .from('auctions')
    .select('player_id')
    .eq('status', 'active')

  const { data: targetsRaw } = team
    ? await supabase.from('targets').select('player_id, max_price').eq('team_id', team.id)
    : { data: [] }

  const leaguePlayerIds = new Set(leaguePlayers.map(p => p.id))
  const activePlayerIds = new Set((activeAuctions ?? []).map(a => a.player_id))

  const freePlayers = (allPlayersRaw ?? [])
    .filter(p => !p.is_sold && !leaguePlayerIds.has(p.id) && !activePlayerIds.has(p.id))
    .map(p => ({ id: p.id, name: p.name, roles: p.roles ?? [], fvm: p.fvm }))

  const allPlayersForTarget = (allPlayersRaw ?? []).map(p => ({
    id: p.id,
    name: p.name,
    serie_a_team: p.serie_a_team,
    roles: p.roles ?? [],
    fvm: p.fvm,
    is_sold: p.is_sold,
    in_active_auction: activePlayerIds.has(p.id),
  }))

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <header className="text-white px-4 py-3 flex items-center justify-between shadow-md" style={{ background: 'var(--boccea-red)' }}>
        <div className="flex items-center gap-3">
          <Image src="/fc-boccea-logo_ufficiale.png" alt="FC Boccea" width={36} height={36} className="rounded-full bg-white p-0.5" />
          <div>
            <h1 className="font-bold text-base leading-tight">Planner</h1>
            <p className="text-xs opacity-75">{team?.team_name ?? user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {team && (
            <span className="text-xl font-bold" style={{ color: 'var(--boccea-gold)' }}>
              {team.budget_remaining} cr
            </span>
          )}
          <Link href="/dashboard" className="text-xs px-2 py-1 rounded border border-white/40 text-white/80 hover:bg-white/10">
            ← Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-6">
        <PlannerClient
          leagues={leagues ?? []}
          selectedLeagueId={selectedLeagueId}
          leaguePlayers={leaguePlayers}
          freePlayers={freePlayers}
          allPlayersForTarget={allPlayersForTarget}
          initialTargets={targetsRaw ?? []}
          budget={team?.budget_remaining ?? 0}
        />
      </main>
    </div>
  )
}
