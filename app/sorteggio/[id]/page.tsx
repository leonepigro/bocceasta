import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { DraftReveal } from './_components/DraftReveal'
import { DraftCountdown } from './_components/DraftCountdown'
import type { DraftResult } from '@/lib/draft/generator'

export default async function SorteggioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const service = await createServiceClient()

  const { data, error } = await service
    .from('draft_sessions')
    .select('id, season, result, scheduled_at, locked_at, applied_at')
    .eq('id', id)
    .single()

  if (error || !data) notFound()

  const isScheduled = !!data.scheduled_at && !data.locked_at
  const isDone = !!data.locked_at

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <header className="text-white px-4 py-4 text-center shadow-md" style={{ background: 'var(--boccea-red)' }}>
        <h1 className="text-xl font-black">🎲 Sorteggio Rose</h1>
        <p className="text-sm font-semibold opacity-90 mt-0.5">{data.season}</p>
        {isDone && (
          <p className="text-xs opacity-70 mt-1">
            Eseguito il {new Date(data.locked_at).toLocaleString('it-IT', {
              day: '2-digit', month: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit', second: '2-digit'
            })}
            {data.applied_at && ' · ✓ Applicato'}
          </p>
        )}
      </header>

      <main className="max-w-2xl mx-auto p-4">
        {isScheduled && (
          <DraftCountdown
            sessionId={id}
            scheduledAt={data.scheduled_at}
          />
        )}
        {isDone && data.result && (
          <DraftReveal draft={data.result as DraftResult} />
        )}
      </main>
    </div>
  )
}
