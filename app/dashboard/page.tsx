import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BudgetHeader } from './_components/BudgetHeader'
import { AuctionList } from './_components/AuctionList'
import { LaunchAuction } from './_components/LaunchAuction'
import { MyRoster } from './_components/MyRoster'
import type { AuctionWithPlayer, Player } from '@/lib/supabase/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (user.user_metadata?.role === 'admin') redirect('/admin')

  const [{ data: team }, { data: config }] = await Promise.all([
    supabase.from('teams').select('*').eq('user_id', user.id).single(),
    supabase.from('config').select('*').eq('id', 1).single(),
  ])

  if (!team) return <p className="p-4">Squadra non trovata. Contatta l&apos;admin.</p>

  const [{ data: soldPlayers }, { data: activeAuctions }] = await Promise.all([
    supabase.from('players').select('*').eq('sold_to_team_id', team.id),
    supabase
      .from('auctions')
      .select(`
        *,
        players ( id, name, serie_a_team, roles, fvm ),
        teams_winner:teams!auctions_current_winner_team_id_fkey ( id, team_name )
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false }),
  ])

  const rosterCount = soldPlayers?.length ?? 0

  return (
    <div className="min-h-screen bg-gray-50">
      <BudgetHeader
        team={team}
        rosterCount={rosterCount}
        rosterMin={25}
        rosterMax={28}
      />
      <main className="max-w-2xl mx-auto p-4 space-y-6">
        <p className="text-gray-400 text-sm text-center">
          {config?.enabled_roles?.length
            ? `Ruoli abilitati: ${config.enabled_roles.join(', ')}`
            : 'Nessun ruolo abilitato — aspetta l\'admin'}
        </p>
        <AuctionList initialAuctions={(activeAuctions ?? []) as AuctionWithPlayer[]} currentTeam={team} />
        {config && <LaunchAuction config={config} />}
        <MyRoster players={(soldPlayers ?? []) as (Player & { sold_price: number })[]} />
      </main>
    </div>
  )
}
