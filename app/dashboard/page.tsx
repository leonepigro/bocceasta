import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BudgetHeader } from './_components/BudgetHeader'
import { AuctionList } from './_components/AuctionList'
import { MyRoster } from './_components/MyRoster'
import { PlayersList } from './_components/PlayersList'
import type { AuctionWithPlayer, Player } from '@/lib/supabase/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const isAdmin = user.user_metadata?.role === 'admin'

  const [{ data: team }, { data: config }] = await Promise.all([
    supabase.from('teams').select('*').eq('user_id', user.id).single(),
    supabase.from('config').select('*').eq('id', 1).single(),
  ])

  if (!team) {
    if (isAdmin) redirect('/admin')
    return <p className="p-4">Squadra non trovata. Contatta l&apos;admin.</p>
  }

  const [{ data: soldPlayers }, { data: activeAuctions }, { data: allPlayers }, { data: myAutobids }] = await Promise.all([
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
    supabase
      .from('players')
      .select('id, name, roles, serie_a_team, fvm, is_sold, sold_price, sold_to_team_id, teams!players_sold_to_team_id_fkey(team_name)')
      .order('name'),
    supabase
      .from('autobids')
      .select('auction_id, max_amount')
      .eq('team_id', team.id),
  ])

  // Build active auction lookup: player_id → { price, winner_team }
  const auctionMap = new Map<number, { price: number; winner: string | null }>()
  for (const a of activeAuctions ?? []) {
    auctionMap.set((a as AuctionWithPlayer).player_id, {
      price: (a as AuctionWithPlayer).current_price,
      winner: (a as AuctionWithPlayer).teams_winner?.team_name ?? null,
    })
  }

  const playersForList = (allPlayers ?? []).map((p: {
    id: number; name: string; roles: string[]; serie_a_team: string | null
    fvm: number | null; is_sold: boolean; sold_price: number | null
    sold_to_team_id: string | null; teams: { team_name: string | null } | { team_name: string | null }[] | null
  }) => {
    const auction = auctionMap.get(p.id)
    return {
      id: p.id,
      name: p.name,
      roles: p.roles,
      serie_a_team: p.serie_a_team,
      fvm: p.fvm,
      is_sold: p.is_sold,
      sold_price: p.sold_price,
      owner_team_name: (Array.isArray(p.teams) ? p.teams[0]?.team_name : p.teams?.team_name) ?? null,
      in_active_auction: !!auction,
      auction_price: auction?.price ?? null,
      auction_winner_team: auction?.winner ?? null,
    }
  })

  const rosterCount = soldPlayers?.length ?? 0

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <BudgetHeader team={team} rosterCount={rosterCount} rosterMin={25} rosterMax={28} isAdmin={isAdmin} />
      <main className="max-w-2xl mx-auto p-4 space-y-4">
        {config?.enabled_roles?.length ? (
          <p className="text-xs text-center text-gray-400">
            Ruoli abilitati al lancio: <span className="font-medium text-gray-600">{config.enabled_roles.join(', ')}</span>
          </p>
        ) : (
          <p className="text-xs text-center text-gray-400">Nessun ruolo abilitato — aspetta l&apos;admin</p>
        )}
        <AuctionList
          initialAuctions={(activeAuctions ?? []) as AuctionWithPlayer[]}
          currentTeam={team}
          autobidMap={Object.fromEntries((myAutobids ?? []).map(a => [a.auction_id, a.max_amount]))}
        />
        <PlayersList players={playersForList} enabledRoles={config?.enabled_roles ?? []} currentTeam={team} />
        <MyRoster players={(soldPlayers ?? []) as (Player & { sold_price: number })[]} />
      </main>
    </div>
  )
}
