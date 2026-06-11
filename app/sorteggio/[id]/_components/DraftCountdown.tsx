'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { executeScheduledDraft } from '@/lib/draft/session-actions'

type Props = {
  sessionId: string
  scheduledAt: string
}

export function DraftCountdown({ sessionId, scheduledAt }: Props) {
  const router = useRouter()
  const target = new Date(scheduledAt).getTime()
  const [remaining, setRemaining] = useState(target - Date.now())
  const [executing, setExecuting] = useState(false)
  const [executed, setExecuted] = useState(false)

  useEffect(() => {
    const tick = setInterval(() => {
      const r = target - Date.now()
      setRemaining(r)

      // Allo scadere: esegui automaticamente (una sola volta)
      if (r <= 0 && !executed && !executing) {
        setExecuting(true)
        clearInterval(tick)
        executeScheduledDraft(sessionId).then(res => {
          if ('done' in res || 'alreadyDone' in res) {
            setExecuted(true)
            router.refresh()
          } else {
            setExecuting(false)
          }
        })
      }
    }, 1000)
    return () => clearInterval(tick)
  }, [target, sessionId, executed, executing, router])

  const totalSec = Math.max(0, Math.floor(remaining / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const pad = (n: number) => String(n).padStart(2, '0')

  const pct = Math.max(0, Math.min(100, (1 - remaining / (24 * 3600 * 1000)) * 100))

  if (executing || executed) {
    return (
      <div className="text-center py-16 space-y-4">
        <div className="text-5xl animate-spin inline-block">🎲</div>
        <p className="text-xl font-bold text-gray-700">Sorteggio in corso…</p>
        <p className="text-sm text-gray-400">La pagina si aggiornerà tra un momento</p>
      </div>
    )
  }

  return (
    <div className="text-center space-y-6 py-8">
      <p className="text-sm text-gray-500 font-medium">Il sorteggio si avvierà automaticamente tra</p>

      {/* Countdown */}
      <div className="flex justify-center gap-3">
        {[{ v: h, l: 'ore' }, { v: m, l: 'min' }, { v: s, l: 'sec' }].map(({ v, l }) => (
          <div key={l} className="text-center">
            <div className="text-5xl font-black tabular-nums" style={{ color: 'var(--boccea-red)' }}>
              {pad(v)}
            </div>
            <p className="text-xs text-gray-400 mt-1">{l}</p>
          </div>
        ))}
      </div>

      {/* Barra progresso */}
      <div className="w-full bg-gray-100 rounded-full h-2 max-w-sm mx-auto">
        <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: 'var(--boccea-red)' }} />
      </div>

      <div className="text-xs text-gray-400 space-y-1">
        <p>Programmato per {new Date(scheduledAt).toLocaleString('it-IT', {
          weekday: 'long', day: '2-digit', month: 'long',
          hour: '2-digit', minute: '2-digit'
        })}</p>
        <p className="text-gray-300">Nessuno può modificare il sorteggio prima dello scadere del timer</p>
      </div>
    </div>
  )
}
