'use client'
import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createTeam, updateTeamBudget, updateTeamInfo, getTeamEmail, updateTeamEmail, resetTeamPassword } from '@/lib/admin/actions'
import type { Team } from '@/lib/supabase/types'

type Props = { teams: Team[] }

function TeamRow({ team, onSaved }: { team: Team; onSaved: () => void }) {
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

  // Carica email quando entra in editing
  useEffect(() => {
    if (editing && !originalEmail) {
      getTeamEmail(team.id).then(r => {
        if (r.email) {
          setEmail(r.email)
          setOriginalEmail(r.email)
        }
      })
    }
  }, [editing, originalEmail, team.id])

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
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold" style={{ color: 'var(--boccea-red)' }}>
            {team.budget_remaining} cr
          </span>
          <button onClick={() => setEditing(true)}
            className="text-xs px-2 py-1 border rounded text-gray-500 hover:bg-gray-50">
            Modifica
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

      {/* Email + password */}
      <div className="border-t pt-2 space-y-2">
        <label className="text-[11px] font-semibold text-gray-500 uppercase">Account</label>
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
  const [form, setForm] = useState({ teamName: '', ownerName: '', email: '', password: '' })
  const [createError, setCreateError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  // Sync quando il server ricarica le props
  useEffect(() => { setTeams(initialTeams) }, [initialTeams])

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateError(null)
    startTransition(async () => {
      const r = await createTeam(form.teamName, form.ownerName, form.email, form.password)
      if ('error' in r) { setCreateError(r.error ?? null); return }
      setShowCreate(false)
      setForm({ teamName: '', ownerName: '', email: '', password: '' })
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
        <form onSubmit={handleCreate} className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2">
          <input placeholder="Nome squadra" value={form.teamName}
            onChange={e => setForm(p => ({ ...p, teamName: e.target.value }))}
            className="w-full border rounded px-3 py-1.5 text-sm" required />
          <input placeholder="Nome partecipante" value={form.ownerName}
            onChange={e => setForm(p => ({ ...p, ownerName: e.target.value }))}
            className="w-full border rounded px-3 py-1.5 text-sm" required />
          <input type="email" placeholder="Email accesso" value={form.email}
            onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
            className="w-full border rounded px-3 py-1.5 text-sm" required />
          <input type="password" placeholder="Password (min 6 caratteri)" value={form.password}
            onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
            className="w-full border rounded px-3 py-1.5 text-sm" required minLength={6} />
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
          <TeamRow key={t.id} team={t} onSaved={() => router.refresh()} />
        ))}
      </div>
    </div>
  )
}
