import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function SorteggioStorico() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'admin') redirect('/dashboard')

  const service = await createServiceClient()
  const { data: sessions } = await service
    .from('draft_sessions')
    .select('id, season, scheduled_at, locked_at, applied_at')
    .order('created_at', { ascending: false })

  function statusLabel(s: { scheduled_at: string | null; locked_at: string | null; applied_at: string | null }) {
    if (s.applied_at) return { text: '✓ Applicato', color: 'text-green-600 bg-green-50 border-green-200' }
    if (s.locked_at) return { text: '🔒 Eseguito', color: 'text-blue-600 bg-blue-50 border-blue-200' }
    if (s.scheduled_at && new Date(s.scheduled_at) > new Date()) return { text: '⏱ In attesa', color: 'text-orange-600 bg-orange-50 border-orange-200' }
    if (s.scheduled_at) return { text: '⚡ Pronto', color: 'text-purple-600 bg-purple-50 border-purple-200' }
    return { text: 'Bozza', color: 'text-gray-500 bg-gray-50 border-gray-200' }
  }

  const fmt = (d: string | null) => d
    ? new Date(d).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
    : '—'

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <header className="text-white px-4 py-3 flex items-center justify-between shadow-md" style={{ background: 'var(--boccea-red)' }}>
        <h1 className="font-bold text-lg">Storico sorteggi</h1>
        <Link href="/admin" className="text-xs px-2 py-1 rounded border border-white/40 text-white/80 hover:bg-white/10">
          ← Admin
        </Link>
      </header>

      <main className="max-w-3xl mx-auto p-4">
        {!sessions?.length ? (
          <p className="text-center text-gray-400 py-12">Nessun sorteggio ancora</p>
        ) : (
          <div className="space-y-2">
            {sessions.map(s => {
              const st = statusLabel(s)
              return (
                <div key={s.id} className="border rounded-xl p-4 bg-white flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{s.season}</p>
                    <div className="flex gap-4 text-xs text-gray-400 mt-1 flex-wrap">
                      {s.scheduled_at && <span>Prog: {fmt(s.scheduled_at)}</span>}
                      {s.locked_at && <span>Eseguito: {fmt(s.locked_at)}</span>}
                      {s.applied_at && <span>Applicato: {fmt(s.applied_at)}</span>}
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full border flex-shrink-0 ${st.color}`}>
                    {st.text}
                  </span>
                  {s.locked_at && (
                    <Link href={`/sorteggio/${s.id}`} target="_blank"
                      className="text-xs px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 flex-shrink-0">
                      Apri →
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
