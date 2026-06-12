'use client'
import { useState, useTransition } from 'react'
import { changeMyPassword } from '@/lib/admin/actions'

export function ChangePasswordForm() {
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    if (pw.length < 6) { setMsg({ text: 'Password min 6 caratteri', ok: false }); return }
    if (pw !== pw2) { setMsg({ text: 'Le password non coincidono', ok: false }); return }
    startTransition(async () => {
      const r = await changeMyPassword(pw)
      if ('error' in r && r.error) setMsg({ text: r.error, ok: false })
      else {
        setMsg({ text: '✓ Password aggiornata', ok: true })
        setPw(''); setPw2('')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="border rounded-lg p-4 bg-white space-y-3">
      <h2 className="font-semibold text-sm">Cambia password</h2>
      <input type="password" placeholder="Nuova password (min 6)"
        value={pw} onChange={e => setPw(e.target.value)}
        className="w-full border rounded px-3 py-2 text-sm" required minLength={6} />
      <input type="password" placeholder="Conferma nuova password"
        value={pw2} onChange={e => setPw2(e.target.value)}
        className="w-full border rounded px-3 py-2 text-sm" required minLength={6} />
      {msg && (
        <p className={`text-xs ${msg.ok ? 'text-green-600' : 'text-red-600'} font-semibold`}>
          {msg.text}
        </p>
      )}
      <button type="submit" disabled={isPending}
        className="w-full text-white px-4 py-2 rounded text-sm font-semibold disabled:opacity-50"
        style={{ background: 'var(--boccea-red)' }}>
        {isPending ? 'Salvo...' : 'Cambia password'}
      </button>
    </form>
  )
}
