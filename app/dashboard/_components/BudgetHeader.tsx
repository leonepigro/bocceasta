'use client'
import Image from 'next/image'
import Link from 'next/link'
import type { Team } from '@/lib/supabase/types'

type Props = {
  team: Team
  rosterCount: number
  rosterMin: number
  rosterMax: number
  isAdmin?: boolean
}

export function BudgetHeader({ team, rosterCount, rosterMin, rosterMax, isAdmin }: Props) {
  const rosterOk = rosterCount >= rosterMin
  return (
    <header className="text-white px-4 py-3 flex items-center justify-between shadow-md" style={{ background: 'var(--boccea-red)' }}>
      <div className="flex items-center gap-3">
        <Image src="/fc-boccea-logo_ufficiale.png" alt="FC Boccea" width={36} height={36} className="rounded-full bg-white p-0.5" />
        <div>
          <h1 className="font-bold text-base leading-tight">{team.team_name}</h1>
          <p className="text-xs opacity-75">{team.owner_name}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-2xl font-bold leading-tight" style={{ color: 'var(--boccea-gold)' }}>
            {team.budget_remaining} cr
          </p>
          <p className={`text-xs ${rosterOk ? 'opacity-75' : 'text-yellow-300 font-semibold'}`}>
            Rosa: {rosterCount} / {rosterMin}-{rosterMax}
          </p>
        </div>
        {isAdmin && (
          <Link
            href="/admin"
            className="text-xs px-2 py-1 rounded border border-white/40 text-white/80 hover:bg-white/10 transition-colors"
          >
            ⚙️ Admin
          </Link>
        )}
      </div>
    </header>
  )
}
