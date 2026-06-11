'use client'
import { useState, useTransition } from 'react'
import { generateDraft, draftStats } from '@/lib/draft/generator'
import type { DraftResult, DraftTeamAssignment } from '@/lib/draft/generator'
import type { Team } from '@/lib/supabase/types'
import { lockDraft, applyLockedDraft } from '@/lib/draft/session-actions'

type RawPlayer = {
  id: number; name: string; roles: string[]; fvm: number | null; serie_a_team: string | null
}
type Props = { teams: Team[]; players: RawPlayer[] }

const ROLE_COLOR: Record<string, string> = {
  Por: '#f59e0b', Dc: '#3b82f6', B: '#3b82f6', Dd: '#60a5fa', Ds: '#60a5fa',
  E: '#06b6d4', M: '#10b981', C: '#10b981', T: '#8b5cf6', W: '#8b5cf6',
  A: '#ef4444', Pc: '#ef4444',
}

export function DraftSection({ teams, players }: Props) {
  const [draft, setDraft] = useState<DraftResult | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [lockedId, setLockedId] = useState<string | null>(null)
  const [lockedAt, setLockedAt] = useState<string | null>(null)
  const [applyResult, setApplyResult] = useState<{ assigned?: number; error?: string } | null>(null)

  function generate() {
    if (lockedId) return
    setDraft(generateDraft(teams, players))
    setSelectedTeam(teams[0]?.id ?? null)
    setApplyResult(null)
  }

  function handleLock() {
    if (!draft || lockedId) return
    if (!confirm('Bloccare il sorteggio? Non potrai più rigenerarlo.')) return
    startTransition(async () => {
      const r = await lockDraft(draft, '2025/26')
      if ('error' in r) { alert(r.error); return }
      setLockedId(r.id)
      setLockedAt(new Date().toISOString())
    })
  }

  function handleApply() {
    if (!lockedId) return
    if (!confirm('Applicare? Sovrascrive tutte le rose attuali.')) return
    startTransition(async () => {
      const r = await applyLockedDraft(lockedId)
      setApplyResult('error' in r ? { error: r.error } : { assigned: r.assigned })
    })
  }

  const viewAssignment: DraftTeamAssignment | null =
    draft?.assignments.find(a => a.team.id === selectedTeam) ?? null

  const publicUrl = lockedId ? `/sorteggio/${lockedId}` : null

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold mb-1">Assegnazione automatica rose</h2>
        <p className="text-xs text-gray-400 mb-4">
          Per ruolo, FVM desc, batch da 10 — best player al team con FVM totale più basso. Ordine team shufflato per ogni ruolo.
        </p>
      </div>

      {/* Stato blocco */}
      {lockedId && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg space-y-2">
          <p className="text-green-700 font-semibold text-sm">
            🔒 Bloccato il {new Date(lockedAt!).toLocaleString('it-IT', {
              day: '2-digit', month: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit', second: '2-digit'
            })}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <a href={publicUrl!} target="_blank" rel="noreferrer"
              className="text-blue-600 underline text-xs font-medium">
              🔗 Link pubblico: {window.location.origin}{publicUrl}
            </a>
            <button onClick={() => navigator.clipboard?.writeText(window.location.origin + publicUrl!)}
              className="text-xs px-2 py-1 border rounded hover:bg-gray-50">
              Copia
            </button>
          </div>
          {!applyResult && (
            <button onClick={handleApply} disabled={isPending}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">
              {isPending ? 'Applico...' : '✓ Applica assegnazione'}
            </button>
          )}
          {applyResult && (
            <p className={`text-sm font-semibold ${applyResult.error ? 'text-red-600' : 'text-green-700'}`}>
              {applyResult.error ?? `✓ ${applyResult.assigned} giocatori assegnati`}
            </p>
          )}
        </div>
      )}

      {/* Azioni */}
      {!lockedId && (
        <div className="flex gap-2 flex-wrap">
          <button onClick={generate} disabled={isPending || players.length === 0}
            className="text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
            style={{ background: 'var(--boccea-red)' }}>
            {draft ? '↺ Rigenera' : '🎲 Genera sorteggio'}
          </button>
          {draft && (
            <button onClick={handleLock} disabled={isPending}
              className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">
              🔒 Blocca sorteggio
            </button>
          )}
        </div>
      )}

      {players.length === 0 && (
        <p className="text-sm text-orange-600">⚠ Nessun giocatore — importa prima l&apos;Excel.</p>
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
                      <tr key={a.team.id}
                        className={`border-b cursor-pointer hover:bg-gray-50 ${selectedTeam === a.team.id ? 'bg-blue-50' : ''}`}
                        onClick={() => setSelectedTeam(a.team.id)}>
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

          {/* Dettaglio squadra */}
          {viewAssignment && (
            <div className="border rounded-lg overflow-hidden">
              <div className="px-4 py-3 flex items-center justify-between" style={{ background: 'var(--boccea-red)' }}>
                <span className="text-white font-bold">{viewAssignment.team.team_name}</span>
                <span className="text-white/70 text-xs">
                  Por: {viewAssignment.gk_serie_a_teams.join(', ') || '—'}
                </span>
              </div>
              <div className="flex flex-wrap gap-1 px-3 py-2 border-b bg-gray-50">
                {draft.assignments.map(a => (
                  <button key={a.team.id} onClick={() => setSelectedTeam(a.team.id)}
                    className={`text-xs px-2 py-0.5 rounded-full transition-colors ${selectedTeam === a.team.id ? 'text-white' : 'bg-white border text-gray-600 hover:bg-gray-100'}`}
                    style={selectedTeam === a.team.id ? { background: 'var(--boccea-red)' } : undefined}>
                    {a.team.team_name}
                  </button>
                ))}
              </div>
              <div className="divide-y max-h-96 overflow-y-auto">
                {viewAssignment.players
                  .sort((a, b) => {
                    const o = ['Por', 'Dc', 'B', 'Dd', 'Ds', 'E', 'M', 'C', 'T', 'W', 'A', 'Pc']
                    return o.indexOf(a.primary_role) - o.indexOf(b.primary_role) || (b.fvm ?? 0) - (a.fvm ?? 0)
                  })
                  .map(p => (
                    <div key={p.id} className="flex items-center gap-3 px-4 py-2">
                      <span className="text-white text-xs font-bold px-2 py-0.5 rounded w-10 text-center flex-shrink-0"
                        style={{ background: ROLE_COLOR[p.primary_role] ?? '#9ca3af' }}>
                        {p.primary_role}
                      </span>
                      <span className="flex-1 text-sm font-medium text-gray-800 truncate">{p.name}</span>
                      <span className="text-xs text-gray-400 truncate">{p.serie_a_team ?? '—'}</span>
                      {p.fvm != null && <span className="text-sm font-bold text-gray-500 flex-shrink-0 w-8 text-right">{p.fvm}</span>}
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
