import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getMyPreferences, getMyTeamId } from '@/lib/preferences/actions'
import { PreferencesEditor } from './_components/PreferencesEditor'

export default async function PreferitiPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const teamId = await getMyTeamId()
  if (!teamId) {
    return (
      <div className="min-h-screen p-8 text-center text-gray-500">
        Nessuna squadra associata al tuo account.
      </div>
    )
  }

  const [{ data: team }, { data: players }, preferences] = await Promise.all([
    supabase.from('teams').select('team_name').eq('id', teamId).single(),
    supabase.from('players')
      .select('id, name, roles, fvm, serie_a_team')
      .order('fvm', { ascending: false }),
    getMyPreferences(),
  ])

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <header className="text-white px-4 py-3 flex items-center justify-between shadow-md"
        style={{ background: 'var(--boccea-red)' }}>
        <div>
          <h1 className="font-bold text-lg">🎯 Wishlist preferiti</h1>
          <p className="text-xs opacity-80">{team?.team_name}</p>
        </div>
        <Link href="/dashboard"
          className="text-xs px-2 py-1 rounded border border-white/40 text-white/80 hover:bg-white/10">
          ← Dashboard
        </Link>
      </header>
      <main className="max-w-3xl mx-auto p-4">
        <PreferencesEditor
          players={(players ?? []) as Parameters<typeof PreferencesEditor>[0]['players']}
          initialPreferences={preferences}
        />
      </main>
    </div>
  )
}
