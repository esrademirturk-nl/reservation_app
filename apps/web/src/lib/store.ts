import { useSyncExternalStore } from 'react'
import { bookings, DEMO_TODAY } from '../data/demo'
import type { Booking } from '../data/types'

/**
 * Tiny demo store. Bookings added through the import flow are pushed into the shared
 * `bookings` array, so every computed value (readiness, gaps, totals) updates at once.
 * The demo mode moves "today" or hides the user's trips for the presentation.
 */
export type DemoMode = 'normal' | 'empty' | 'after'

export const MODES: { id: DemoMode; label: string; today: string; note: string }[] = [
  { id: 'normal', label: 'Before the trip', today: DEMO_TODAY, note: 'Fri 30 Oct · Rome in 13 days' },
  { id: 'empty', label: 'New user', today: DEMO_TODAY, note: 'No bookings yet' },
  { id: 'after', label: 'Back from Rome', today: '2026-11-17', note: 'Tue 17 Nov · trip completed' },
]

const read = (): DemoMode => {
  try {
    return (sessionStorage.getItem('waypad-mode') as DemoMode) || 'normal'
  } catch {
    return 'normal'
  }
}

let mode: DemoMode = read()

// Bookings added in this browser session survive a page reload
const ADDED = 'waypad-added'
const loadAdded = (): Booking[] => {
  try {
    return JSON.parse(sessionStorage.getItem(ADDED) || '[]')
  } catch {
    return []
  }
}
loadAdded().forEach((b) => {
  if (!bookings.some((x) => x.id === b.id)) bookings.push(b)
})
let version = 0
const listeners = new Set<() => void>()
const emit = () => {
  version++
  listeners.forEach((l) => l())
}

export const getMode = () => mode
export const demoToday = () => MODES.find((m) => m.id === mode)!.today

export function setMode(m: DemoMode) {
  mode = m
  if (m === 'empty') {
    // a fresh start: forget bookings added during the demo
    try {
      sessionStorage.removeItem(ADDED)
    } catch {
      /* storage unavailable */
    }
  }
  try {
    sessionStorage.setItem('waypad-mode', m)
  } catch {
    /* storage unavailable */
  }
  emit()
}

export function addBooking(b: Booking) {
  const i = bookings.findIndex((x) => x.ref === b.ref && x.tripId === b.tripId)
  if (i >= 0) bookings[i] = b // same confirmation code updates instead of duplicating
  else bookings.push(b)
  if (mode === 'empty') mode = 'normal'
  try {
    sessionStorage.setItem(ADDED, JSON.stringify([...loadAdded().filter((x) => x.id !== b.id), b]))
  } catch {
    /* storage unavailable */
  }
  emit()
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** Re-render on any store change; returns a number usable as a React key. */
export const useStoreVersion = () => useSyncExternalStore(subscribe, () => version)
