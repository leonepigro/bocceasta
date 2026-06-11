'use client'
import { useState, useTransition } from 'react'
import { generateDraft, draftStats } from '@/lib/draft/generator'
import type { DraftResult, DraftTeamAssignment } from '@/lib/draft/generator'
import type { Team } from '@/lib/supabase/types'
import { applyDraft } from '@/lib/draft/actions'

type RawPlayer = {
  id: number; name: string; roles: string[]; fvm: number | null; serie_a_team: string | null
}

type Props = {
  teams: Team[]
  players: RawPlayer[]
}

const ROLE_COLOR: Record<string, string> = {
  Por: '#f59e0b', Dc: '#3b82f6', B: '#3b82f6', Dd: '#60a5fa', Ds: '#60a5fa',
  E: '#06b6d4', M: '#10b981', C: '#10b981', T: '#8b5cf6', W: '#8b5cf6',
  A: '#ef4444', Pc: '#ef4444',
}

export function DraftSection({ teams, players }: Props) {
  const [draft, setDraft] = useState<DraftResult | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [applyResult, setApplyResult] = useState<{ assigned?: number; errors?: string[]; error?: string } | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  function generate() {
    setDraft(generateDraft(teams, players))
    setSelectedTeam(teams[0]?.id ?? null)
    setApplyResult(null)
    setConfirmed(false)
  }

  function handleApply() {
    if (!draft) return
    if (!confirm(`Applicare l'assegnazione? Sovrascrive tutte le rose attuali.`)) return
    const assignments = draft.assignments.flatMap(a =>
      a.players.map(p => ({ playerId: p.id, teamId: a.team.id, fvm: p.fvm }))
    )
    startTransition(async () => {
      const r = await applyDraft(assignments)
      setApplyResult(r)
      if (!('error' in r)) setConfirmed(true)
    })
  }

  const viewAssignment: DraftTeamAssignment | null = draft?.assignments.find(a => a.team.id === selectedTeam) ?? null

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold mb-1">Assegnazione automatica rose</h2>
        <p className="text-xs text-gray-400 mb-4">
          Portieri: 2 squadre Serie A a partecipante. Outfield: batch di {teams.length} per FVM, mescolati tra partecipanti.
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={generate}
          disabled={isPending || players.length === 0}
          className="text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
          style={{ background: 'var(--boccea-red)' }}
        >
          {draft ? '↺ Rigenera sorteggio' : '🎲 Genera sorteggio'}
        </button>
        {draft && !confirmed && (
          <button
            onClick={handleApply}
            disabled={isPending}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
          >
            {isPending ? 'Applico...' : '✓ Applica assegnazione'}
          </button>
        )}
      </div>

      {players.length === 0 && (
        <p className="text-sm text-orange-600">⚠ Nessun giocatore nel DB — importa prima l&apos;Excel calciatori.</p>
      )}

      {applyResult && (
        <div className={`p-3 rounded-lg text-sm ${confirmed ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {confirmed
            ? `✓ ${applyResult.assigned} giocatori assegnati${applyResult.errors?.length ? ` · ${applyResult.errors.length} errori` : ''}`
            : `Errore: ${'error' in applyResult ? applyResult.error : ''}`
          }
        </div>
      )}

      {draft && (
        <div className="space-y-3">
          {/* Riepilogo bilanciamento */}
          <div className="border rounded-lg overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 border-b">
              <p className="text-xs font-semibold text-gray-600">Riepilogo bilanciamento</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-3 py-2 font-medium">Squadra</th>
                    <th className="text-right px-2 py-2">Por</th>
                    <th className="text-right px-2 py-2">Mov</th>
                    <th className="text-right px-2 py-2 text-yellow-600">FVM</th>
                    <th className="text-right px-2 py-2 text-blue-500">Dif</th>
                    <th className="text-right px-2 py-2 text-green-600">Mid</th>
                    <th className="text-right px-2 py-2 text-purple-500">T/W</th>
                    <th className="text-right px-2 py-2 text-red-500">Att</th>
                  </tr>
                </thead>
                <tbody>
                  {draft.assignments.map(a => {
                    const s = draftStats(a)
                    return (
                      <tr
                        key={a.team.id}
                        className={`border-b cursor-pointer hover:bg-gray-50 ${selectedTeam === a.team.id ? 'bg-blue-50' : ''}`}
                        onClick={() => setSelectedTeam(a.team.id)}
                      >
                        <td className="px-3 py-1.5 font-medium truncate max-w-[120px]">{a.team.team_name}</td>
                        <td className="text-right px-2 py-1.5">{s.byRole['Por'] ?? 0}</td>
                        <td className="text-right px-2 py-1.5 font-bold">{s.outfieldCount}</td>
                        <td className="text-right px-2 py-1.5 text-yellow-600 font-semibold">{s.fvmTotal}</td>
                        <td className="text-right px-2 py-1.5">{(s.byRole['Dc'] ?? 0) + (s.byRole['B'] ?? 0) + (s.byRole['Dd'] ?? 0) + (s.byRole['Ds'] ?? 0)}</td>
                        <td className="text-right px-2 py-1.5">{(s.byRole['E'] ?? 0) + (s.byRole['M'] ?? 0) + (s.byRole['C'] ?? 0)}</td>
                        <td className="text-right px-2 py-1.5">{(s.byRole['T'] ?? 0) + (s.byRole['W'] ?? 0)}</td>
                        <td className="text-right px-2 py-1.5">{(s.byRole['A'] ?? 0) + (s.byRole['Pc'] ?? 0)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Dettaglio squadra selezionata */}
          {viewAssignment && (
            <div className="border rounded-lg overflow-hidden">
              <div className="px-4 py-3 flex items-center justify-between" style={{ background: 'var(--boccea-red)' }}>
                <span className="text-white font-bold">{viewAssignment.team.team_name}</span>
                <span className="text-white/70 text-xs">
                  Portieri da: {viewAssignment.gk_serie_a_teams.join(', ') || '—'}
                </span>
              </div>

              {/* Selezione squadra */}
              <div className="flex flex-wrap gap-1 px-3 py-2 border-b bg-gray-50">
                {draft.assignments.map(a => (
                  <button
                    key={a.team.id}
                    onClick={() => setSelectedTeam(a.team.id)}
                    className={`text-xs px-2 py-0.5 rounded-full transition-colors ${selectedTeam === a.team.id ? 'text-white' : 'bg-white border text-gray-600 hover:bg-gray-100'}`}
                    style={selectedTeam === a.team.id ? { background: 'var(--boccea-red)' } : undefined}
                  >
                    {a.team.team_name}
                  </button>
                ))}
              </div>

              <div className="divide-y max-h-96 overflow-y-auto">
                {viewAssignment.players
                  .sort((a, b) => {
                    const roleOrder = ['Por', 'Dc', 'B', 'Dd', 'Ds', 'E', 'M', 'C', 'T', 'W', 'A', 'Pc']
                    return roleOrder.indexOf(a.primary_role) - roleOrder.indexOf(b.primary_role)
                      || (b.fvm ?? 0) - (a.fvm ?? 0)
                  })
                  .map(p => (
                    <div key={p.id} className="flex items-center gap-3 px-4 py-2">
                      <span
                        className="text-white text-xs font-bold px-2 py-0.5 rounded w-10 text-center flex-shrink-0"
                        style={{ background: ROLE_COLOR[p.primary_role] ?? '#9ca3af' }}
                      >
                        {p.primary_role}
                      </span>
                      <span className="flex-1 text-sm font-medium text-gray-800 truncate">{p.name}</span>
                      <span className="text-xs text-gray-400 truncate">{p.serie_a_team ?? '—'}</span>
                      {p.fvm != null && (
                        <span className="text-sm font-bold text-gray-500 flex-shrink-0 w-8 text-right">{p.fvm}</span>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
