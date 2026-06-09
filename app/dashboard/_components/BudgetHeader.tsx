'use client'
import type { Team } from '@/lib/supabase/types'

type Props = {
  team: Team
  rosterCount: number
  rosterMin: number
  rosterMax: number
}

export function BudgetHeader({ team, rosterCount, rosterMin, rosterMax }: Props) {
  return (
    <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
      <div>
        <h1 className="font-bold text-lg">{team.team_name}</h1>
        <p className="text-sm text-gray-500">{team.owner_name}</p>
      </div>
      <div className="text-right">
        <p className="text-2xl font-bold text-green-600">{team.budget_remaining} cr</p>
        <p className="text-xs text-gray-500">
          Rosa: {rosterCount} / {rosterMin}-{rosterMax}
        </p>
      </div>
    </header>
  )
}
