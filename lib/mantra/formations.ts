export type FormationSlot = {
  label: string
  roles: string[]
}

export type Formation = {
  name: string
  slots: FormationSlot[]
}

// Mantra Experience 2025/2026 — 11 moduli ufficiali
export const FORMATIONS: Formation[] = [
  {
    name: '3-4-3',
    slots: [
      { label: 'P', roles: ['P'] },
      { label: 'DC/B', roles: ['DC', 'B'] },
      { label: 'DC/B', roles: ['DC', 'B'] },
      { label: 'DC/B', roles: ['DC', 'B'] },
      { label: 'E', roles: ['E'] },
      { label: 'M/C', roles: ['M', 'C'] },
      { label: 'C', roles: ['C'] },
      { label: 'E', roles: ['E'] },
      { label: 'W/A', roles: ['W', 'A'] },
      { label: 'W/A', roles: ['W', 'A'] },
      { label: 'A/PC', roles: ['A', 'PC'] },
    ],
  },
  {
    name: '3-4-1-2',
    slots: [
      { label: 'P', roles: ['P'] },
      { label: 'DC/B', roles: ['DC', 'B'] },
      { label: 'DC/B', roles: ['DC', 'B'] },
      { label: 'DC/B', roles: ['DC', 'B'] },
      { label: 'E', roles: ['E'] },
      { label: 'M/C', roles: ['M', 'C'] },
      { label: 'C', roles: ['C'] },
      { label: 'E', roles: ['E'] },
      { label: 'T', roles: ['T'] },
      { label: 'A/PC', roles: ['A', 'PC'] },
      { label: 'A/PC', roles: ['A', 'PC'] },
    ],
  },
  {
    name: '3-4-2-1',
    slots: [
      { label: 'P', roles: ['P'] },
      { label: 'DC/B', roles: ['DC', 'B'] },
      { label: 'DC/B', roles: ['DC', 'B'] },
      { label: 'DC/B', roles: ['DC', 'B'] },
      { label: 'M', roles: ['M'] },
      { label: 'E', roles: ['E'] },
      { label: 'M/C', roles: ['M', 'C'] },
      { label: 'E/W', roles: ['E', 'W'] },
      { label: 'T', roles: ['T'] },
      { label: 'T/A', roles: ['T', 'A'] },
      { label: 'A/PC', roles: ['A', 'PC'] },
    ],
  },
  {
    name: '3-5-2',
    slots: [
      { label: 'P', roles: ['P'] },
      { label: 'DC/B', roles: ['DC', 'B'] },
      { label: 'DC/B', roles: ['DC', 'B'] },
      { label: 'DC/B', roles: ['DC', 'B'] },
      { label: 'M', roles: ['M'] },
      { label: 'M/C', roles: ['M', 'C'] },
      { label: 'C', roles: ['C'] },
      { label: 'E/W', roles: ['E', 'W'] },
      { label: 'E', roles: ['E'] },
      { label: 'A/PC', roles: ['A', 'PC'] },
      { label: 'A/PC', roles: ['A', 'PC'] },
    ],
  },
  {
    name: '3-5-1-1',
    slots: [
      { label: 'P', roles: ['P'] },
      { label: 'DC/B', roles: ['DC', 'B'] },
      { label: 'DC/B', roles: ['DC', 'B'] },
      { label: 'DC/B', roles: ['DC', 'B'] },
      { label: 'M', roles: ['M'] },
      { label: 'M', roles: ['M'] },
      { label: 'C', roles: ['C'] },
      { label: 'E/W', roles: ['E', 'W'] },
      { label: 'E/W', roles: ['E', 'W'] },
      { label: 'T/A', roles: ['T', 'A'] },
      { label: 'A/PC', roles: ['A', 'PC'] },
    ],
  },
  {
    name: '4-3-3',
    slots: [
      { label: 'P', roles: ['P'] },
      { label: 'DD', roles: ['DD'] },
      { label: 'DC', roles: ['DC'] },
      { label: 'DC', roles: ['DC'] },
      { label: 'DS', roles: ['DS'] },
      { label: 'M/C', roles: ['M', 'C'] },
      { label: 'M', roles: ['M'] },
      { label: 'C', roles: ['C'] },
      { label: 'W/A', roles: ['W', 'A'] },
      { label: 'W/A', roles: ['W', 'A'] },
      { label: 'A/PC', roles: ['A', 'PC'] },
    ],
  },
  {
    name: '4-3-1-2',
    slots: [
      { label: 'P', roles: ['P'] },
      { label: 'DD', roles: ['DD'] },
      { label: 'DC', roles: ['DC'] },
      { label: 'DC', roles: ['DC'] },
      { label: 'DS', roles: ['DS'] },
      { label: 'M/C', roles: ['M', 'C'] },
      { label: 'M', roles: ['M'] },
      { label: 'C', roles: ['C'] },
      { label: 'T', roles: ['T'] },
      { label: 'T/A/PC', roles: ['T', 'A', 'PC'] },
      { label: 'A/PC', roles: ['A', 'PC'] },
    ],
  },
  {
    name: '4-4-2',
    slots: [
      { label: 'P', roles: ['P'] },
      { label: 'DD', roles: ['DD'] },
      { label: 'DC', roles: ['DC'] },
      { label: 'DC', roles: ['DC'] },
      { label: 'DS', roles: ['DS'] },
      { label: 'M/C', roles: ['M', 'C'] },
      { label: 'C', roles: ['C'] },
      { label: 'E', roles: ['E'] },
      { label: 'E/W', roles: ['E', 'W'] },
      { label: 'A/PC', roles: ['A', 'PC'] },
      { label: 'A/PC', roles: ['A', 'PC'] },
    ],
  },
  {
    name: '4-1-4-1',
    slots: [
      { label: 'P', roles: ['P'] },
      { label: 'DD', roles: ['DD'] },
      { label: 'DC', roles: ['DC'] },
      { label: 'DC', roles: ['DC'] },
      { label: 'DS', roles: ['DS'] },
      { label: 'M', roles: ['M'] },
      { label: 'C/T', roles: ['C', 'T'] },
      { label: 'T', roles: ['T'] },
      { label: 'E/W', roles: ['E', 'W'] },
      { label: 'W', roles: ['W'] },
      { label: 'A/PC', roles: ['A', 'PC'] },
    ],
  },
  {
    name: '4-4-1-1',
    slots: [
      { label: 'P', roles: ['P'] },
      { label: 'DD', roles: ['DD'] },
      { label: 'DC', roles: ['DC'] },
      { label: 'DC', roles: ['DC'] },
      { label: 'DS', roles: ['DS'] },
      { label: 'M', roles: ['M'] },
      { label: 'C', roles: ['C'] },
      { label: 'E/W', roles: ['E', 'W'] },
      { label: 'E/W', roles: ['E', 'W'] },
      { label: 'T/A', roles: ['T', 'A'] },
      { label: 'A/PC', roles: ['A', 'PC'] },
    ],
  },
  {
    name: '4-2-3-1',
    slots: [
      { label: 'P', roles: ['P'] },
      { label: 'DD', roles: ['DD'] },
      { label: 'DC', roles: ['DC'] },
      { label: 'DC', roles: ['DC'] },
      { label: 'DS', roles: ['DS'] },
      { label: 'M', roles: ['M'] },
      { label: 'M/C', roles: ['M', 'C'] },
      { label: 'W/T', roles: ['W', 'T'] },
      { label: 'T', roles: ['T'] },
      { label: 'W/A', roles: ['W', 'A'] },
      { label: 'A/PC', roles: ['A', 'PC'] },
    ],
  },
]

// Gruppi ruolo per budget planning
export const ROLE_GROUPS = [
  { key: 'portieri', label: 'Portieri', roles: ['P'], color: '#f59e0b' },
  { key: 'difensori', label: 'Difensori', roles: ['DC', 'B', 'DD', 'DS'], color: '#3b82f6' },
  { key: 'esterni', label: 'Esterni', roles: ['E'], color: '#06b6d4' },
  { key: 'centrocampisti', label: 'Centrocampisti', roles: ['M', 'C'], color: '#10b981' },
  { key: 'trequartisti', label: 'Trequarti/Ali', roles: ['T', 'W'], color: '#8b5cf6' },
  { key: 'attaccanti', label: 'Attaccanti', roles: ['A', 'PC'], color: '#ef4444' },
]
