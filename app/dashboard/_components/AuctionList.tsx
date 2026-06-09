'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AuctionWithPlayer, Team } from '@/lib/supabase/types'
import { AuctionCard } from './AuctionCard'

type Props = {
  initialAuctions: AuctionWithPlayer[]
  currentTeam: Team
}

export function AuctionList({ initialAuctions, currentTeam }: Props) {
  const [auctions, setAuctions] = useState<AuctionWithPlayer[]>(initialAuctions)
  const supabase = createClient()

  // Sync when server re-renders pass new initialAuctions (after router.refresh())
  useEffect(() => {
    setAuctions(initialAuctions)
  }, [initialAuctions])

  useEffect(() => {
    async function fetchAuctions() {
      const { data } = await supabase
        .from('auctions')
        .select(`
          *,
          players ( id, name, serie_a_team, roles, fvm ),
          teams_winner:teams!auctions_current_winner_team_id_fkey ( id, team_name )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
      if (data) setAuctions(data as AuctionWithPlayer[])
    }

    const channel = supabase
      .channel('auctions-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'auctions' }, fetchAuctions)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bids' }, fetchAuctions)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase])

  if (auctions.length === 0) {
    return <p className="text-center text-gray-400 py-8">Nessuna asta attiva</p>
  }

  return (
    <section>
      <h2 className="font-semibold mb-3">Aste in corso ({auctions.length})</h2>
      <div className="space-y-3">
        {auctions.map(a => (
          <AuctionCard key={a.id} auction={a} currentTeam={currentTeam} />
        ))}
      </div>
    </section>
  )
}
