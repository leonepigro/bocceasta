export type FormationSlot = {
  label: string
  roles: string[]
}

export type Formation = {
  name: string
  slots: FormationSlot[]
}

// Ruoli come salvati nel DB (da Excel fantacalcio.it Mantra)
// Por, Dc, B, Dd, Ds, E, M, C, T, W, A, Pc

// Mantra Experience 2025/2026 — 11 moduli ufficiali
export const FORMATIONS: Formation[] = [
  {
    name: '3-4-3',
    slots: [
      { label: 'Por', roles: ['Por'] },
      { label: 'Dc', roles: ['Dc'] },
      { label: 'Dc', roles: ['Dc'] },
      { label: 'Dc/B', roles: ['Dc', 'B'] },
      { label: 'E', roles: ['E'] },
      { label: 'M/C', roles: ['M', 'C'] },
      { label: 'C', roles: ['C'] },
      { label: 'E', roles: ['E'] },
      { label: 'W/A', roles: ['W', 'A'] },
      { label: 'W/A', roles: ['W', 'A'] },
      { label: 'A/Pc', roles: ['A', 'Pc'] },
    ],
  },
  {
    name: '3-4-1-2',
    slots: [
      { label: 'Por', roles: ['Por'] },
      { label: 'Dc', roles: ['Dc'] },
      { label: 'Dc', roles: ['Dc'] },
      { label: 'Dc/B', roles: ['Dc', 'B'] },
      { label: 'E', roles: ['E'] },
      { label: 'M/C', roles: ['M', 'C'] },
      { label: 'C', roles: ['C'] },
      { label: 'E', roles: ['E'] },
      { label: 'T', roles: ['T'] },
      { label: 'A/Pc', roles: ['A', 'Pc'] },
      { label: 'A/Pc', roles: ['A', 'Pc'] },
    ],
  },
  {
    name: '3-4-2-1',
    slots: [
      { label: 'Por', roles: ['Por'] },
      { label: 'Dc', roles: ['Dc'] },
      { label: 'Dc', roles: ['Dc'] },
      { label: 'Dc/B', roles: ['Dc', 'B'] },
      { label: 'M', roles: ['M'] },
      { label: 'E', roles: ['E'] },
      { label: 'M/C', roles: ['M', 'C'] },
      { label: 'E/W', roles: ['E', 'W'] },
      { label: 'T', roles: ['T'] },
      { label: 'T/A', roles: ['T', 'A'] },
      { label: 'A/Pc', roles: ['A', 'Pc'] },
    ],
  },
  {
    name: '3-5-2',
    slots: [
      { label: 'Por', roles: ['Por'] },
      { label: 'Dc', roles: ['Dc'] },
      { label: 'Dc', roles: ['Dc'] },
      { label: 'Dc/B', roles: ['Dc', 'B'] },
      { label: 'M', roles: ['M'] },
      { label: 'M/C', roles: ['M', 'C'] },
      { label: 'C', roles: ['C'] },
      { label: 'E/W', roles: ['E', 'W'] },
      { label: 'E', roles: ['E'] },
      { label: 'A/Pc', roles: ['A', 'Pc'] },
      { label: 'A/Pc', roles: ['A', 'Pc'] },
    ],
  },
  {
    name: '3-5-1-1',
    slots: [
      { label: 'Por', roles: ['Por'] },
      { label: 'Dc', roles: ['Dc'] },
      { label: 'Dc', roles: ['Dc'] },
      { label: 'Dc/B', roles: ['Dc', 'B'] },
      { label: 'M', roles: ['M'] },
      { label: 'M', roles: ['M'] },
      { label: 'C', roles: ['C'] },
      { label: 'E/W', roles: ['E', 'W'] },
      { label: 'E/W', roles: ['E', 'W'] },
      { label: 'T/A', roles: ['T', 'A'] },
      { label: 'A/Pc', roles: ['A', 'Pc'] },
    ],
  },
  {
    name: '4-3-3',
    slots: [
      { label: 'Por', roles: ['Por'] },
      { label: 'Dd', roles: ['Dd'] },
      { label: 'Dc', roles: ['Dc'] },
      { label: 'Dc', roles: ['Dc'] },
      { label: 'Ds', roles: ['Ds'] },
      { label: 'M/C', roles: ['M', 'C'] },
      { label: 'M', roles: ['M'] },
      { label: 'C', roles: ['C'] },
      { label: 'W/A', roles: ['W', 'A'] },
      { label: 'W/A', roles: ['W', 'A'] },
      { label: 'A/Pc', roles: ['A', 'Pc'] },
    ],
  },
  {
    name: '4-3-1-2',
    slots: [
      { label: 'Por', roles: ['Por'] },
      { label: 'Dd', roles: ['Dd'] },
      { label: 'Dc', roles: ['Dc'] },
      { label: 'Dc', roles: ['Dc'] },
      { label: 'Ds', roles: ['Ds'] },
      { label: 'M/C', roles: ['M', 'C'] },
      { label: 'M', roles: ['M'] },
      { label: 'C', roles: ['C'] },
      { label: 'T', roles: ['T'] },
      { label: 'T/A/Pc', roles: ['T', 'A', 'Pc'] },
      { label: 'A/Pc', roles: ['A', 'Pc'] },
    ],
  },
  {
    name: '4-4-2',
    slots: [
      { label: 'Por', roles: ['Por'] },
      { label: 'Dd', roles: ['Dd'] },
      { label: 'Dc', roles: ['Dc'] },
      { label: 'Dc', roles: ['Dc'] },
      { label: 'Ds', roles: ['Ds'] },
      { label: 'M/C', roles: ['M', 'C'] },
      { label: 'C', roles: ['C'] },
      { label: 'E', roles: ['E'] },
      { label: 'E/W', roles: ['E', 'W'] },
      { label: 'A/Pc', roles: ['A', 'Pc'] },
      { label: 'A/Pc', roles: ['A', 'Pc'] },
    ],
  },
  {
    name: '4-1-4-1',
    slots: [
      { label: 'Por', roles: ['Por'] },
      { label: 'Dd', roles: ['Dd'] },
      { label: 'Dc', roles: ['Dc'] },
      { label: 'Dc', roles: ['Dc'] },
      { label: 'Ds', roles: ['Ds'] },
      { label: 'M', roles: ['M'] },
      { label: 'C/T', roles: ['C', 'T'] },
      { label: 'T', roles: ['T'] },
      { label: 'E/W', roles: ['E', 'W'] },
      { label: 'W', roles: ['W'] },
      { label: 'A/Pc', roles: ['A', 'Pc'] },
    ],
  },
  {
    name: '4-4-1-1',
    slots: [
      { label: 'Por', roles: ['Por'] },
      { label: 'Dd', roles: ['Dd'] },
      { label: 'Dc', roles: ['Dc'] },
      { label: 'Dc', roles: ['Dc'] },
      { label: 'Ds', roles: ['Ds'] },
      { label: 'M', roles: ['M'] },
      { label: 'C', roles: ['C'] },
      { label: 'E/W', roles: ['E', 'W'] },
      { label: 'E/W', roles: ['E', 'W'] },
      { label: 'T/A', roles: ['T', 'A'] },
      { label: 'A/Pc', roles: ['A', 'Pc'] },
    ],
  },
  {
    name: '4-2-3-1',
    slots: [
      { label: 'Por', roles: ['Por'] },
      { label: 'Dd', roles: ['Dd'] },
      { label: 'Dc', roles: ['Dc'] },
      { label: 'Dc', roles: ['Dc'] },
      { label: 'Ds', roles: ['Ds'] },
      { label: 'M', roles: ['M'] },
      { label: 'M/C', roles: ['M', 'C'] },
      { label: 'W/T', roles: ['W', 'T'] },
      { label: 'T', roles: ['T'] },
      { label: 'W/A', roles: ['W', 'A'] },
      { label: 'A/Pc', roles: ['A', 'Pc'] },
    ],
  },
]

// Gruppi ruolo per budget planning (abbreviazioni Excel fantacalcio.it)
export const ROLE_GROUPS = [
  { key: 'portieri', label: 'Portieri', roles: ['Por'], color: '#f59e0b' },
  { key: 'difensori', label: 'Difensori', roles: ['Dc', 'B', 'Dd', 'Ds'], color: '#3b82f6' },
  { key: 'esterni', label: 'Esterni', roles: ['E'], color: '#06b6d4' },
  { key: 'centrocampisti', label: 'Centrocampisti', roles: ['M', 'C'], color: '#10b981' },
  { key: 'trequartisti', label: 'Trequarti/Ali', roles: ['T', 'W'], color: '#8b5cf6' },
  { key: 'attaccanti', label: 'Attaccanti', roles: ['A', 'Pc'], color: '#ef4444' },
]

// Tutti i ruoli Mantra per filtri UI
export const ALL_ROLES = ['Por', 'Dc', 'B', 'Dd', 'Ds', 'E', 'M', 'C', 'T', 'W', 'A', 'Pc']
