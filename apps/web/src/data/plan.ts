/** Day-plan items that are not bookings (user-planned stops, free time, AI suggestions). Rome only for the demo. */

export interface PlannedStop {
  kind: 'planned'
  id: string
  tripId: string
  start: string // ISO local datetime
  title: string
  subtitle: string
  audioGuide?: boolean
  /** position on the schematic day map, 0–100 */
  x: number
  y: number
}

export interface FreeTime {
  kind: 'free'
  id: string
  tripId: string
  start: string
  end: string
  suggestions: { id: string; title: string; meta: string }[]
}

export const planned: PlannedStop[] = [
  { kind: 'planned', id: 'p-breakfast-13', tripId: 'rome', start: '2026-11-13T09:00', title: 'Breakfast at hotel', subtitle: 'Hotel Roma Centro · 45 min', x: 70, y: 32 },
  { kind: 'planned', id: 'p-trevi-13', tripId: 'rome', start: '2026-11-13T17:30', title: 'Trevi Fountain', subtitle: 'Piazza di Trevi · 30 min', audioGuide: true, x: 48, y: 26 },
  { kind: 'planned', id: 'p-pantheon-14', tripId: 'rome', start: '2026-11-14T15:00', title: 'Pantheon', subtitle: 'Piazza della Rotonda · 45 min', audioGuide: true, x: 40, y: 34 },
  { kind: 'planned', id: 'p-trastevere-14', tripId: 'rome', start: '2026-11-14T19:00', title: 'Trastevere evening walk', subtitle: 'Santa Maria in Trastevere · 2 h', x: 30, y: 62 },
  { kind: 'planned', id: 'p-campo-15', tripId: 'rome', start: '2026-11-15T10:30', title: "Campo de' Fiori market", subtitle: "Campo de' Fiori · 1 h", x: 36, y: 44 },
  { kind: 'planned', id: 'p-arrival-12', tripId: 'rome', start: '2026-11-12T12:00', title: 'Leonardo Express to Termini', subtitle: 'Fiumicino → Roma Termini · 32 min', x: 82, y: 22 },
  { kind: 'planned', id: 'p-spanish-12', tripId: 'rome', start: '2026-11-12T17:00', title: 'Spanish Steps at sunset', subtitle: 'Piazza di Spagna · 1 h', x: 52, y: 14 },
]

export const freeTime: FreeTime[] = [
  {
    kind: 'free', id: 'f-13', tripId: 'rome', start: '2026-11-13T13:00', end: '2026-11-13T16:00',
    suggestions: [
      { id: 's-enzo', title: 'Trattoria da Enzo', meta: 'Lunch · €€ · 12 min walk' },
      { id: 's-capitoline', title: 'Capitoline Museums', meta: 'Museum · 1.5 h · 8 min walk' },
    ],
  },
]

/** Schematic map positions for booking locations (0–100). */
export const bookingPos: Record<string, { x: number; y: number }> = {
  'rome-hotel': { x: 70, y: 32 },
  'rome-colosseum': { x: 62, y: 72 },
  'rome-dinner': { x: 38, y: 46 },
  'rome-vatican': { x: 14, y: 22 },
  'rome-train': { x: 82, y: 22 },
}

export const tripSuggestions = [
  {
    id: 'ts-forum', when: 'Fri 13 Nov · after 12:30',
    title: "You're near the Colosseum — add the Roman Forum",
    text: 'Your combined ticket also covers the Roman Forum and Palatine Hill, a 3-minute walk from the arena exit.',
  },
  {
    id: 'ts-transfer', when: 'Thu 12 Nov · 10:55',
    title: 'Airport transfer for your arrival',
    text: 'The Leonardo Express reaches Termini in 32 minutes, a 10-minute walk from Hotel Roma Centro.',
  },
  {
    id: 'ts-lunch', when: 'Sat 14 Nov · 12:30',
    title: 'Lunch near the Vatican',
    text: 'Your museum visit ends around 12:30. Borgo Pio has small trattorias five minutes from the exit.',
  },
]
