'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { registerUser } from '@/lib/auth/register'

export function RegisterForm() {
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (pw.length < 6) { setError('Password min 6 caratteri'); return }
    if (pw !== pw2) { setError('Le password non coincidono'); return }
    startTransition(async () => {
      const r = await registerUser(email.trim(), pw)
      if ('error' in r && r.error) { setError(r.error); return }
      router.push('/dashboard')
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit}
      className="border rounded-xl p-5 bg-white shadow-sm space-y-3">
      <input type="email" placeholder="Email" value={email}
        onChange={e => setEmail(e.target.value)} required
        className="w-full border rounded-lg px-3 py-2 text-sm" />
      <input type="password" placeholder="Password (min 6)" value={pw}
        onChange={e => setPw(e.target.value)} required minLength={6}
        className="w-full border rounded-lg px-3 py-2 text-sm" />
      <input type="password" placeholder="Conferma password" value={pw2}
        onChange={e => setPw2(e.target.value)} required minLength={6}
        className="w-full border rounded-lg px-3 py-2 text-sm" />
      {error && <p className="text-red-600 text-xs font-semibold">{error}</p>}
      <button type="submit" disabled={isPending}
        className="w-full text-white px-4 py-2.5 rounded-lg font-semibold disabled:opacity-50"
        style={{ background: 'var(--boccea-red)' }}>
        {isPending ? 'Registrazione...' : 'Registrati'}
      </button>
    </form>
  )
}
