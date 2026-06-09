'use client'

type Section = 'import' | 'roles' | 'config' | 'auctions' | 'teams' | 'export'

type Props = {
  active: Section
  onChange: (s: Section) => void
}

const sections: { id: Section; label: string }[] = [
  { id: 'import', label: 'Import Excel' },
  { id: 'roles', label: 'Ruoli abilitati' },
  { id: 'config', label: 'Configurazione' },
  { id: 'auctions', label: 'Aste attive' },
  { id: 'teams', label: 'Squadre' },
  { id: 'export', label: 'Export' },
]

export function AdminSidebar({ active, onChange }: Props) {
  return (
    <nav className="w-48 shrink-0">
      <ul className="space-y-1">
        {sections.map(s => (
          <li key={s.id}>
            <button
              onClick={() => onChange(s.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                active === s.id ? 'bg-blue-600 text-white font-semibold' : 'hover:bg-gray-100'
              }`}
            >
              {s.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
