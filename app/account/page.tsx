import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChangePasswordForm } from './_components/ChangePasswordForm'

export default async function AccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <header className="text-white px-4 py-3 flex items-center justify-between shadow-md"
        style={{ background: 'var(--boccea-red)' }}>
        <h1 className="font-bold text-lg">👤 Il mio account</h1>
        <Link href="/dashboard"
          className="text-xs px-2 py-1 rounded border border-white/40 text-white/80 hover:bg-white/10">
          ← Dashboard
        </Link>
      </header>
      <main className="max-w-md mx-auto p-4 space-y-4">
        <div className="border rounded-lg p-4 bg-white">
          <p className="text-xs text-gray-500 mb-1">Email accesso</p>
          <p className="font-semibold text-sm">{user.email}</p>
          <p className="text-[11px] text-gray-400 mt-1">Per cambiare l&apos;email contatta l&apos;admin.</p>
        </div>
        <ChangePasswordForm />
      </main>
    </div>
  )
}
