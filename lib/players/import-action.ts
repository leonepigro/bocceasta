'use server'
import { createServiceClient, createClient } from '@/lib/supabase/server'
import { parsePlayersXlsx, inspectXlsxHeaders } from './import'

export async function importPlayers(data: Uint8Array): Promise<
  { imported: number; errors: string[]; headers?: string[] } | { error: string }
> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'admin') return { error: 'Unauthorized' }

  const buf = Buffer.from(data)
  const headers = inspectXlsxHeaders(buf)
  let players
  try {
    players = parsePlayersXlsx(buf)
  } catch (e) {
    return { error: `Parse error: ${e instanceof Error ? e.message : String(e)}` }
  }

  const service = await createServiceClient()
  const errors: string[] = []
  let imported = 0

  for (let i = 0; i < players.length; i += 100) {
    const batch = players.slice(i, i + 100)
    const { error } = await service
      .from('players')
      .upsert(batch, { onConflict: 'id' })
    if (error) errors.push(`Batch ${Math.floor(i / 100) + 1}: ${error.message}`)
    else imported += batch.length
  }

  return { imported, errors, headers }
}
