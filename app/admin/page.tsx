import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminPanel from './_components/AdminPanel'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const isAdmin = user.user_metadata?.role === 'admin'
  if (!isAdmin) redirect('/dashboard')

  const [{ data: config }, { data: teams }, { data: auctions }, { data: players }, { data: activeDraft }] = await Promise.all([
    supabase.from('config').select('*').eq('id', 1).single(),
    supabase.from('teams').select('*').order('team_name'),
    supabase
      .from('auctions')
      .select('*, players(name, roles), teams_winner:teams!auctions_current_winner_team_id_fkey(team_name)')
      .eq('status', 'active')
      .order('expires_at'),
    supabase.from('players').select('id, name, roles, fvm, serie_a_team').order('fvm', { ascending: false }),
    supabase
      .from('draft_sessions')
      .select('id, season, scheduled_at, locked_at, applied_at')
      .is('applied_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  return (
    <AdminPanel
      config={config}
      teams={teams ?? []}
      auctions={(auctions ?? []) as Parameters<typeof AdminPanel>[0]['auctions']}
      players={(players ?? []) as Parameters<typeof AdminPanel>[0]['players']}
      activeDraft={activeDraft ?? null}
    />
  )
}
