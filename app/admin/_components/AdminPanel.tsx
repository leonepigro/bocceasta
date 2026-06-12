'use client'
import { useState } from 'react'
import Link from 'next/link'
import { AdminSidebar } from './AdminSidebar'
import { ImportSection } from './ImportSection'
import { RolesSection } from './RolesSection'
import { ConfigSection } from './ConfigSection'
import { AuctionsSection } from './AuctionsSection'
import { TeamsSection } from './TeamsSection'
import { ExportSection } from './ExportSection'
import { FantacalcioSection } from './FantacalcioSection'
import { DraftSection } from './DraftSection'
import { WishlistConfigSection } from './WishlistConfigSection'
import type { Config, Team } from '@/lib/supabase/types'

type Section = 'import' | 'roles' | 'config' | 'auctions' | 'teams' | 'export' | 'fantacalcio' | 'draft' | 'wishlist'

type AuctionRow = {
  id: string
  current_price: number
  expires_at: string
  players: { name: string; roles: string[] }
  teams_winner: { team_name: string } | null
}

type RawPlayer = { id: number; name: string; roles: string[]; fvm: number | null; serie_a_team: string | null }
type ActiveDraft = { id: string; season: string; scheduled_at: string | null; locked_at: string | null; applied_at: string | null; result: unknown } | null

type Props = {
  config: Config | null
  teams: Team[]
  auctions: AuctionRow[]
  players: RawPlayer[]
  activeDraft: ActiveDraft
}

export default function AdminPanel({ config, teams, auctions, players, activeDraft }: Props) {
  const [active, setActive] = useState<Section>('import')

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <header className="text-white px-6 py-3 flex items-center justify-between shadow-md" style={{ background: 'var(--boccea-red)' }}>
        <div className="flex items-center gap-3">
          <span className="text-xl">⚙️</span>
          <h1 className="font-bold text-lg">Admin — Fantacalcio Boccea</h1>
        </div>
        <Link
          href="/dashboard"
          className="text-xs px-3 py-1.5 rounded border border-white/40 text-white/80 hover:bg-white/10 transition-colors"
        >
          ← Dashboard
        </Link>
      </header>
      <div className="flex gap-6 p-6 max-w-5xl mx-auto">
        <AdminSidebar active={active} onChange={setActive} />
        <main className="flex-1 bg-white rounded-xl shadow p-6">
          {active === 'import' && <ImportSection />}
          {active === 'roles' && config && <RolesSection config={config} />}
          {active === 'config' && config && <ConfigSection config={config} />}
          {active === 'auctions' && <AuctionsSection auctions={auctions} />}
          {active === 'teams' && <TeamsSection teams={teams} />}
          {active === 'export' && <ExportSection />}
          {active === 'fantacalcio' && <FantacalcioSection teams={teams} />}
          {active === 'draft' && <DraftSection teams={teams} players={players} activeDraft={activeDraft} />}
          {active === 'wishlist' && config && (
            <WishlistConfigSection initial={{
              enabled: config.wishlist_enabled,
              maxTotal: config.wishlist_max_total,
              maxPerRole: config.wishlist_max_per_role,
              maxFvm: config.wishlist_max_fvm,
            }} />
          )}
        </main>
      </div>
    </div>
  )
}
