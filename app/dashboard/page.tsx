import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { RostersView } from './_components/RostersView'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const isAdmin = user.user_metadata?.role === 'admin'

  const { data: myTeam } = await supabase.from('teams').select('*').eq('user_id', user.id).single()
  if (!myTeam) {
    if (isAdmin) redirect('/admin')
    return <p className="p-4">Squadra non trovata. Contatta l&apos;admin.</p>
  }

  const [{ data: teams }, { data: players }] = await Promise.all([
    supabase.from('teams').select('id, team_name, owner_name').order('team_name'),
    supabase
      .from('players')
      .select('id, name, roles, fvm, serie_a_team, sold_to_team_id, is_sold')
      .order('name'),
  ])

  // Raggruppa giocatori per team
  type Player = {
    id: number; name: string; roles: string[]; fvm: number | null
    serie_a_team: string | null; sold_to_team_id: string | null
  }
  const allPlayers = (players ?? []) as (Player & { is_sold: boolean })[]
  const byTeam = new Map<string, Player[]>()
  const free: Player[] = []
  for (const p of allPlayers) {
    if (p.sold_to_team_id) {
      const arr = byTeam.get(p.sold_to_team_id) ?? []
      arr.push(p)
      byTeam.set(p.sold_to_team_id, arr)
    } else if (!p.is_sold) {
      free.push(p)
    }
  }

  const rosters = (teams ?? []).map(t => ({
    id: t.id,
    team_name: t.team_name,
    owner_name: t.owner_name,
    players: byTeam.get(t.id) ?? [],
  }))

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <header className="text-white px-4 py-3 flex items-center justify-between shadow-md"
        style={{ background: 'var(--boccea-red)' }}>
        <div className="flex items-center gap-3">
          <Image src="/fc-boccea-logo_ufficiale.png" alt="FC Boccea" width={36} height={36}
            className="rounded-full bg-white p-0.5" />
          <div>
            <h1 className="font-bold text-base leading-tight">FC Boccea</h1>
            <p className="text-xs opacity-75">{myTeam.team_name} — {myTeam.owner_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/preferiti"
            className="text-xs px-2 py-1 rounded border border-white/40 text-white/80 hover:bg-white/10">
            ⭐ Wishlist
          </Link>
          <Link href="/planner"
            className="text-xs px-2 py-1 rounded border border-white/40 text-white/80 hover:bg-white/10">
            🎯 Planner
          </Link>
          <Link href="/account"
            className="text-xs px-2 py-1 rounded border border-white/40 text-white/80 hover:bg-white/10">
            👤 Account
          </Link>
          {isAdmin && (
            <Link href="/admin"
              className="text-xs px-2 py-1 rounded border border-white/40 text-white/80 hover:bg-white/10">
              ⚙️ Admin
            </Link>
          )}
        </div>
      </header>
      <main className="max-w-3xl mx-auto p-4">
        <RostersView myTeamId={myTeam.id} rosters={rosters} freeAgents={free} />
      </main>
    </div>
  )
}
