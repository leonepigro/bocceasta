'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: 'var(--background)' }}>
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm border border-gray-100">
        <div className="flex justify-center mb-4">
          <Image src="/fc-boccea-logo_ufficiale.png" alt="FC Boccea" width={110} height={110} priority />
        </div>
        <h1 className="text-2xl font-bold text-center mb-1" style={{ color: 'var(--boccea-red)' }}>
          Fantacalcio Boccea
        </h1>
        <p className="text-center text-gray-500 text-sm mb-6">Asta 2026/27</p>
        <form onSubmit={handleLogin} className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
            style={{ '--tw-ring-color': 'var(--boccea-red)' } as React.CSSProperties}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
          />
          {error && (
            <p className="text-sm px-3 py-2 bg-red-50 text-red-700 rounded-lg border border-red-200">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full text-white py-2.5 rounded-lg font-semibold text-sm disabled:opacity-60 transition-opacity"
            style={{ background: loading ? 'var(--boccea-red-dark)' : 'var(--boccea-red)' }}
          >
            {loading ? 'Accesso in corso...' : 'Accedi'}
          </button>
        </form>
      </div>
    </main>
  )
}
