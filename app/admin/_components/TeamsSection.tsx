'use client'
import { useState, useTransition } from 'react'
import { createTeam, updateTeamBudget } from '@/lib/admin/actions'
import type { Team } from '@/lib/supabase/types'

type Props = { teams: Team[] }

export function TeamsSection({ teams: initialTeams }: Props) {
  const [teams, setTeams] = useState(initialTeams)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ teamName: '', ownerName: '', email: '', password: '' })
  const [createError, setCreateError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateError(null)
    startTransition(async () => {
      const r = await createTeam(form.teamName, form.ownerName, form.email, form.password)
      if ('error' in r) setCreateError(r.error ?? null)
      else {
        setShowCreate(false)
        setForm({ teamName: '', ownerName: '', email: '', password: '' })
      }
    })
  }

  function handleBudgetChange(teamId: string, budget: number) {
    startTransition(async () => {
      await updateTeamBudget(teamId, budget)
      setTeams(prev => prev.map(t => t.id === teamId ? { ...t, budget_remaining: budget } : t))
    })
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Squadre ({teams.length}/10)</h2>
        {teams.length < 10 && (
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg"
          >
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
          <input type="password" placeholder="Password accesso" value={form.password}
            onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
            className="w-full border rounded px-3 py-1.5 text-sm" required minLength={6} />
          {createError && <p className="text-red-500 text-xs">{createError}</p>}
          <button type="submit" disabled={isPending}
            className="bg-green-600 text-white px-4 py-1.5 rounded text-sm disabled:opacity-50">
            {isPending ? 'Creazione...' : 'Crea squadra'}
          </button>
        </form>
      )}

      <div className="space-y-2">
        {teams.map(t => (
          <div key={t.id} className="flex items-center justify-between border rounded-lg p-3">
            <div>
              <p className="font-medium">{t.team_name}</p>
              <p className="text-xs text-gray-500">{t.owner_name}</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                defaultValue={t.budget_remaining}
                onBlur={e => {
                  const v = parseInt(e.target.value)
                  if (!isNaN(v) && v !== t.budget_remaining) handleBudgetChange(t.id, v)
                }}
                className="w-20 border rounded px-2 py-1 text-sm text-right"
              />
              <span className="text-xs text-gray-400">cr</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
