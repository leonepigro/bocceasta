import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { FormationAnalysis } from './_components/FormationAnalysis'
import { BudgetPlanner } from './_components/BudgetPlanner'
import { TargetList } from './_components/TargetList'

export default async function PlannerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: team } = await supabase
    .from('teams')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!team) redirect('/dashboard')

  const [
    { data: rosterRaw },
    { data: allPlayersRaw },
    { data: activeAuctions },
    { data: targetsRaw },
  ] = await Promise.all([
    supabase
      .from('players')
      .select('id, name, roles, fvm')
      .eq('sold_to_team_id', team.id),
    supabase
      .from('players')
      .select('id, name, serie_a_team, roles, fvm, is_sold')
      .order('name'),
    supabase
      .from('auctions')
      .select('player_id')
      .eq('status', 'active'),
    supabase
      .from('targets')
      .select('player_id, max_price')
      .eq('team_id', team.id),
  ])

  const activePlayerIds = new Set((activeAuctions ?? []).map(a => a.player_id))

  const rosterPlayers = (rosterRaw ?? []).map(p => ({
    id: p.id,
    name: p.name,
    roles: p.roles ?? [],
    fvm: p.fvm,
  }))

  const freePlayers = (allPlayersRaw ?? [])
    .filter(p => !p.is_sold && !activePlayerIds.has(p.id))
    .map(p => ({
      id: p.id,
      name: p.name,
      roles: p.roles ?? [],
      fvm: p.fvm,
    }))

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
      {/* Header */}
      <header className="text-white px-4 py-3 flex items-center justify-between shadow-md" style={{ background: 'var(--boccea-red)' }}>
        <div className="flex items-center gap-3">
          <Image src="/fc-boccea-logo_ufficiale.png" alt="FC Boccea" width={36} height={36} className="rounded-full bg-white p-0.5" />
          <div>
            <h1 className="font-bold text-base leading-tight">Planner</h1>
            <p className="text-xs opacity-75">{team.team_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold" style={{ color: 'var(--boccea-gold)' }}>
            {team.budget_remaining} cr
          </span>
          <Link href="/dashboard" className="text-xs px-2 py-1 rounded border border-white/40 text-white/80 hover:bg-white/10">
            ← Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Analisi moduli */}
        <section>
          <h2 className="text-base font-bold mb-3 flex items-center gap-2">
            ⚽ Analisi moduli Mantra
            <span className="text-xs text-gray-400 font-normal">Rosa: {rosterPlayers.length} giocatori</span>
          </h2>
          <FormationAnalysis rosterPlayers={rosterPlayers} freePlayers={freePlayers} />
        </section>

        {/* Budget planner */}
        <section>
          <h2 className="text-base font-bold mb-3">💰 Budget per ruolo</h2>
          <BudgetPlanner
            budgetRemaining={team.budget_remaining}
            rosterPlayers={rosterPlayers}
            freePlayers={freePlayers}
          />
        </section>

        {/* Target list */}
        <section>
          <h2 className="text-base font-bold mb-3">🎯 Lista target</h2>
          <TargetList
            allPlayers={allPlayersForTarget}
            initialTargets={targetsRaw ?? []}
            budget={team.budget_remaining}
          />
        </section>
      </main>
    </div>
  )
}
