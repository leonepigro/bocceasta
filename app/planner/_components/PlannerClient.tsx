'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LeagueSelector } from './LeagueSelector'
import { FormationAnalysis } from './FormationAnalysis'
import { BudgetPlanner } from './BudgetPlanner'
import { TargetList } from './TargetList'
import type { PlayerNode } from '@/lib/mantra/matcher'

type League = { id: string; name: string; csv_team_name: string; created_at: string }
type TargetRow = { player_id: number; max_price: number }
type PlayerRow = {
  id: number; name: string; serie_a_team: string | null
  roles: string[]; fvm: number | null; is_sold: boolean; in_active_auction: boolean
}

type Props = {
  leagues: League[]
  selectedLeagueId: string | null
  leaguePlayers: PlayerNode[]
  freePlayers: PlayerNode[]
  allPlayersForTarget: PlayerRow[]
  initialTargets: TargetRow[]
  budget: number
}

export function PlannerClient({
  leagues,
  selectedLeagueId,
  leaguePlayers,
  freePlayers,
  allPlayersForTarget,
  initialTargets,
  budget,
}: Props) {
  const router = useRouter()
  const [localSelectedId, setLocalSelectedId] = useState(selectedLeagueId)

  function handleSelect(id: string) {
    setLocalSelectedId(id)
    router.push(`/planner?league=${id}`)
  }

  const selectedLeague = leagues.find(l => l.id === localSelectedId)

  return (
    <div className="space-y-6">
      {/* Selezione lega */}
      <section>
        <h2 className="text-base font-bold mb-3">Le mie leghe</h2>
        <LeagueSelector
          leagues={leagues}
          selectedId={localSelectedId}
          onSelect={handleSelect}
        />
      </section>

      {/* Analisi moduli */}
      {leaguePlayers.length > 0 ? (
        <>
          <section>
            <h2 className="text-base font-bold mb-1 flex items-center gap-2">
              ⚽ Analisi moduli Mantra
            </h2>
            <p className="text-xs text-gray-400 mb-3">
              {selectedLeague?.name} · {selectedLeague?.csv_team_name} · {leaguePlayers.length} giocatori
            </p>
            <FormationAnalysis rosterPlayers={leaguePlayers} freePlayers={freePlayers} />
          </section>

          <section>
            <h2 className="text-base font-bold mb-3">💰 Budget per ruolo</h2>
            <BudgetPlanner
              budgetRemaining={budget}
              rosterPlayers={leaguePlayers}
              freePlayers={freePlayers}
            />
          </section>
        </>
      ) : (
        leagues.length > 0 && localSelectedId && (
          <div className="text-center py-8 text-gray-400 text-sm">
            Nessun giocatore trovato per questa lega. Assicurati di aver importato l&apos;Excel calciatori prima.
          </div>
        )
      )}

      {/* Target list sempre visibile */}
      <section>
        <h2 className="text-base font-bold mb-3">🎯 Lista target</h2>
        <TargetList
          allPlayers={allPlayersForTarget}
          initialTargets={initialTargets}
          budget={budget}
        />
      </section>
    </div>
  )
}
