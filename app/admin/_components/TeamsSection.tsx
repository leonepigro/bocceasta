'use client'
import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createTeam, updateTeamBudget, updateTeamInfo, getTeamEmail, updateTeamEmail, resetTeamPassword, deleteTeam, listUsersWithoutTeam, createTeamForExistingUser, deleteUser, listTeamMembers, addTeamMember, removeTeamMember } from '@/lib/admin/actions'
import type { OrphanUser, TeamMember } from '@/lib/admin/actions'
import type { Team } from '@/lib/supabase/types'

type Props = { teams: Team[] }

function TeamRow({ team, onSaved, orphans, onOrphansChange }: {
  team: Team; onSaved: () => void; orphans: OrphanUser[]; onOrphansChange: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [teamName, setTeamName] = useState(team.team_name)
  const [ownerName, setOwnerName] = useState(team.owner_name)
  const [budget, setBudget] = useState(team.budget_remaining)
  const [email, setEmail] = useState<string>('')
  const [originalEmail, setOriginalEmail] = useState<string>('')
  const [newPassword, setNewPassword] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [pwReset, setPwReset] = useState(false)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [addMemberId, setAddMemberId] = useState('')

  function refreshMembers() {
    listTeamMembers(team.id).then(setMembers)
  }

  // Carica email + membri quando entra in editing
  useEffect(() => {
    if (editing) {
      if (!originalEmail) {
        getTeamEmail(team.id).then(r => {
          if (r.email) {
            setEmail(r.email)
            setOriginalEmail(r.email)
          }
        })
      }
      refreshMembers()
    }
  }, [editing, originalEmail, team.id])  // eslint-disable-line react-hooks/exhaustive-deps

  function handleSave() {
    setError(null)
    setPwReset(false)
    startTransition(async () => {
      const tasks: Promise<{ error?: string; success?: boolean }>[] = [
        updateTeamInfo(team.id, teamName, ownerName),
        budget !== team.budget_remaining
          ? updateTeamBudget(team.id, budget) : Promise.resolve({ success: true }),
      ]
      if (email && email !== originalEmail) {
        tasks.push(updateTeamEmail(team.id, email))
      }
      if (newPassword.length >= 6) {
        tasks.push(resetTeamPassword(team.id, newPassword))
      }
      const results = await Promise.all(tasks)
      for (const r of results) {
        if (r.error) { setError(r.error); return }
      }
      if (newPassword.length >= 6) setPwReset(true)
      setNewPassword('')
      setEditing(false)
      onSaved()
    })
  }

  function handleCancel() {
    setTeamName(team.team_name)
    setOwnerName(team.owner_name)
    setBudget(team.budget_remaining)
    setEmail(originalEmail)
    setNewPassword('')
    setEditing(false)
  }

  if (!editing) {
    return (
      <div className="flex items-center justify-between border rounded-lg p-3">
        <div>
          <p className="font-medium">{team.team_name}</p>
          <p className="text-xs text-gray-500">{team.owner_name}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold mr-1" style={{ color: 'var(--boccea-red)' }}>
            {team.budget_remaining} cr
          </span>
          <button onClick={() => setEditing(true)}
            className="text-xs px-2 py-1 border rounded text-gray-500 hover:bg-gray-50">
            Modifica
          </button>
          <button
            onClick={() => {
              if (!confirm(`Cancellare squadra "${team.team_name}"?\nI giocatori assegnati torneranno svincolati. L'utente resta registrato.`)) return
              startTransition(async () => {
                const r = await deleteTeam(team.id)
                if ('error' in r && r.error) { setError(r.error); return }
                onSaved()
              })
            }}
            disabled={isPending}
            className="text-xs px-2 py-1 border border-red-200 rounded text-red-600 hover:bg-red-50 disabled:opacity-50">
            🗑
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="border rounded-lg p-3 space-y-2 bg-gray-50">
      <div className="grid grid-cols-2 gap-2">
        <input value={teamName} onChange={e => setTeamName(e.target.value)}
          placeholder="Nome squadra"
          className="border rounded px-2 py-1.5 text-sm col-span-2" />
        <input value={ownerName} onChange={e => setOwnerName(e.target.value)}
          placeholder="Nome partecipante"
          className="border rounded px-2 py-1.5 text-sm" />
        <div className="flex items-center gap-1">
          <input type="number" min={0} value={budget}
            onChange={e => setBudget(parseInt(e.target.value) || 0)}
            className="border rounded px-2 py-1.5 text-sm w-full text-right" />
          <span className="text-xs text-gray-400 shrink-0">cr</span>
        </div>
      </div>

      {/* Membri (multi-utente per team) */}
      <div className="border-t pt-2 space-y-2">
        <label className="text-[11px] font-semibold text-gray-500 uppercase">Membri ({members.length})</label>
        <div className="space-y-1">
          {members.map(m => (
            <div key={m.user_id} className="flex items-center gap-2 text-xs bg-white rounded px-2 py-1">
              <span className="font-mono flex-1 truncate">{m.email}</span>
              {m.is_primary && <span className="text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded text-[10px]">primary</span>}
              <span className="text-gray-400 text-[10px]">{new Date(m.added_at).toLocaleDateString('it-IT')}</span>
              {!m.is_primary && (
                <button type="button"
                  onClick={() => {
                    if (!confirm(`Rimuovere ${m.email} dal team?`)) return
                    startTransition(async () => {
                      const r = await removeTeamMember(team.id, m.user_id)
                      if ('error' in r && r.error) { setError(r.error); return }
                      refreshMembers()
                      onOrphansChange()
                    })
                  }}
                  className="text-red-600 hover:bg-red-50 px-1 rounded">
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        {/* Aggiungi membro */}
        {orphans.length > 0 && (
          <div className="flex gap-1">
            <select value={addMemberId} onChange={e => setAddMemberId(e.target.value)}
              className="flex-1 border rounded px-2 py-1 text-xs">
              <option value="">+ Aggiungi membro orfano…</option>
              {orphans.map(u => (
                <option key={u.id} value={u.id}>{u.email}</option>
              ))}
            </select>
            <button type="button" disabled={!addMemberId || isPending}
              onClick={() => {
                if (!addMemberId) return
                startTransition(async () => {
                  const r = await addTeamMember(team.id, addMemberId)
                  if ('error' in r && r.error) { setError(r.error); return }
                  setAddMemberId('')
                  refreshMembers()
                  onOrphansChange()
                })
              }}
              className="text-xs px-2 py-1 bg-blue-600 text-white rounded disabled:opacity-40">
              +
            </button>
          </div>
        )}
      </div>

      {/* Email + password */}
      <div className="border-t pt-2 space-y-2">
        <label className="text-[11px] font-semibold text-gray-500 uppercase">Account primario</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="Email accesso"
          className="w-full border rounded px-2 py-1.5 text-sm" />
        <div className="flex items-center gap-2">
          <input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)}
            placeholder="Nuova password (min 6) — lascia vuoto per non cambiare"
            className="flex-1 border rounded px-2 py-1.5 text-sm" />
          {newPassword.length > 0 && newPassword.length < 6 && (
            <span className="text-xs text-orange-600">min 6</span>
          )}
        </div>
        {pwReset && (
          <p className="text-green-600 text-xs">✓ password resettata</p>
        )}
      </div>

      {error && <p className="text-red-500 text-xs">{error}</p>}
      <div className="flex gap-2">
        <button onClick={handleSave} disabled={isPending}
          className="text-white px-3 py-1.5 rounded text-sm font-semibold disabled:opacity-50"
          style={{ background: 'var(--boccea-red)' }}>
          {isPending ? 'Salvo...' : 'Salva'}
        </button>
        <button onClick={handleCancel} className="px-3 py-1.5 rounded text-sm border text-gray-500">
          Annulla
        </button>
      </div>
    </div>
  )
}

export function TeamsSection({ teams: initialTeams }: Props) {
  const [teams, setTeams] = useState(initialTeams)
  const [showCreate, setShowCreate] = useState(false)
  const [mode, setMode] = useState<'existing' | 'new'>('existing')
  const [form, setForm] = useState({ teamName: '', ownerName: '', email: '', password: '', userId: '' })
  const [createError, setCreateError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [availableUsers, setAvailableUsers] = useState<OrphanUser[]>([])
  const router = useRouter()

  useEffect(() => { setTeams(initialTeams) }, [initialTeams])

  // Carica utenti orfani sempre (anche se form chiuso, per la sezione sotto)
  function refreshOrphans() {
    listUsersWithoutTeam().then(setAvailableUsers)
  }
  useEffect(refreshOrphans, [])
  useEffect(() => { if (showCreate) refreshOrphans() }, [showCreate])

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateError(null)
    startTransition(async () => {
      const r = mode === 'existing' && form.userId
        ? await createTeamForExistingUser(form.teamName, form.ownerName, form.userId)
        : await createTeam(form.teamName, form.ownerName, form.email, form.password)
      if ('error' in r) { setCreateError(r.error ?? null); return }
      setShowCreate(false)
      setForm({ teamName: '', ownerName: '', email: '', password: '', userId: '' })
      router.refresh()
    })
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Squadre ({teams.length}/10)</h2>
        {teams.length < 10 && (
          <button onClick={() => setShowCreate(!showCreate)}
            className="text-sm text-white px-3 py-1.5 rounded-lg"
            style={{ background: 'var(--boccea-red)' }}>
            + Aggiungi
          </button>
        )}
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
          {/* Tab modalità */}
          <div className="flex gap-1 border-b">
            <button type="button" onClick={() => setMode('existing')}
              className={`px-3 py-2 text-xs font-semibold border-b-2 ${
                mode === 'existing' ? 'border-red-500 text-red-700' : 'border-transparent text-gray-500'
              }`}>
              Lega utente registrato ({availableUsers.length})
            </button>
            <button type="button" onClick={() => setMode('new')}
              className={`px-3 py-2 text-xs font-semibold border-b-2 ${
                mode === 'new' ? 'border-red-500 text-red-700' : 'border-transparent text-gray-500'
              }`}>
              Crea nuovo account
            </button>
          </div>

          <input placeholder="Nome squadra" value={form.teamName}
            onChange={e => setForm(p => ({ ...p, teamName: e.target.value }))}
            className="w-full border rounded px-3 py-1.5 text-sm" required />
          <input placeholder="Nome partecipante" value={form.ownerName}
            onChange={e => setForm(p => ({ ...p, ownerName: e.target.value }))}
            className="w-full border rounded px-3 py-1.5 text-sm" required />

          {mode === 'existing' ? (
            <>
              <select value={form.userId}
                onChange={e => setForm(p => ({ ...p, userId: e.target.value }))}
                className="w-full border rounded px-3 py-1.5 text-sm" required>
                <option value="">Seleziona utente registrato senza squadra…</option>
                {availableUsers.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.email} ({u.source === 'self' ? 'self-reg' : u.source === 'admin' ? 'admin' : '?'})
                  </option>
                ))}
              </select>
              {availableUsers.length === 0 && (
                <p className="text-xs text-gray-500">
                  Nessun utente disponibile. Indica loro di registrarsi su <code>/register</code> o usa &quot;Crea nuovo account&quot;.
                </p>
              )}
            </>
          ) : (
            <>
              <input type="email" placeholder="Email accesso" value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                className="w-full border rounded px-3 py-1.5 text-sm" required />
              <input type="password" placeholder="Password (min 6 caratteri)" value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                className="w-full border rounded px-3 py-1.5 text-sm" required minLength={6} />
            </>
          )}

          {createError && <p className="text-red-500 text-xs">{createError}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={isPending}
              className="text-white px-4 py-1.5 rounded text-sm font-semibold disabled:opacity-50"
              style={{ background: 'var(--boccea-red)' }}>
              {isPending ? 'Creazione...' : 'Crea squadra'}
            </button>
            <button type="button" onClick={() => setShowCreate(false)}
              className="px-4 py-1.5 rounded text-sm border text-gray-500">
              Annulla
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {teams.map(t => (
          <TeamRow key={t.id} team={t} orphans={availableUsers}
            onSaved={() => { router.refresh(); refreshOrphans() }}
            onOrphansChange={refreshOrphans} />
        ))}
      </div>

      {/* Utenti orfani */}
      <div className="mt-8 border-t pt-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Utenti senza squadra ({availableUsers.length})</h2>
          <button onClick={refreshOrphans}
            className="text-xs text-blue-600 underline">Aggiorna</button>
        </div>
        {availableUsers.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">Nessun utente orfano</p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-3 py-2 font-medium">Email</th>
                  <th className="text-left px-2 py-2">Origine</th>
                  <th className="text-left px-2 py-2">Registrato</th>
                  <th className="text-left px-2 py-2">Ultimo login</th>
                  <th className="text-right px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {availableUsers.map(u => (
                  <tr key={u.id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono">{u.email}</td>
                    <td className="px-2 py-2">
                      {u.source === 'self' && <span className="text-green-700 bg-green-50 px-1.5 py-0.5 rounded">self</span>}
                      {u.source === 'admin' && <span className="text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">admin</span>}
                      {u.source === 'unknown' && <span className="text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">?</span>}
                    </td>
                    <td className="px-2 py-2 text-gray-500">
                      {u.created_at ? new Date(u.created_at).toLocaleString('it-IT', {
                        day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'
                      }) : '—'}
                    </td>
                    <td className="px-2 py-2 text-gray-500">
                      {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString('it-IT', {
                        day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'
                      }) : <span className="text-gray-300">mai</span>}
                    </td>
                    <td className="text-right px-3 py-2">
                      <button
                        onClick={() => {
                          if (!confirm(`Cancellare definitivamente l'utente ${u.email}?`)) return
                          startTransition(async () => {
                            const r = await deleteUser(u.id)
                            if ('error' in r && r.error) { alert(`Errore: ${r.error}`); return }
                            refreshOrphans()
                          })
                        }}
                        disabled={isPending}
                        className="text-xs px-2 py-1 border border-red-200 rounded text-red-600 hover:bg-red-50 disabled:opacity-50">
                        🗑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
