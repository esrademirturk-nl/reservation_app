import { bookings, DEMO_TODAY, extraDeadlines, trips } from '../data/demo'
import type { Booking, Deadline, Gap, Trip } from '../data/types'

const DAY = 86_400_000
const d = (iso: string) => new Date(iso.slice(0, 10) + 'T00:00:00')

export const today = () => d(DEMO_TODAY)

export const daysBetween = (a: string | Date, b: string | Date) =>
  Math.round(((typeof b === 'string' ? d(b) : b).getTime() - (typeof a === 'string' ? d(a) : a).getTime()) / DAY)

export const daysUntil = (iso: string) => daysBetween(today(), iso)

export const nights = (t: Trip) => daysBetween(t.start, t.end)

export const bookingsFor = (tripId: string) =>
  bookings
    .filter((b) => b.tripId === tripId && b.status !== 'cancelled')
    .sort((a, b) => a.start.localeCompare(b.start))

export const upcomingTrips = () =>
  trips.filter((t) => daysUntil(t.end) >= 0).sort((a, b) => a.start.localeCompare(b.start))

export const nextTrip = () => upcomingTrips()[0]

export const tripById = (id: string) => trips.find((t) => t.id === id)

/** ISO dates of the nights of a trip (start .. end-1). */
const tripNights = (t: Trip) => {
  const out: string[] = []
  for (let i = 0; i < nights(t); i++) out.push(new Date(d(t.start).getTime() + i * DAY + 12 * 3600_000).toISOString().slice(0, 10))
  return out
}

const coveredNights = (tripId: string) => {
  const set = new Set<string>()
  for (const b of bookingsFor(tripId).filter((b) => b.type === 'hotel' && b.end)) {
    const n = daysBetween(b.start, b.end!)
    for (let i = 0; i < n; i++) set.add(new Date(d(b.start).getTime() + i * DAY + 12 * 3600_000).toISOString().slice(0, 10))
  }
  return set
}

export const missingNights = (t: Trip) => {
  const covered = coveredNights(t.id)
  return tripNights(t).filter((n) => !covered.has(n))
}

/** Readiness = 4 checks: getting there, every night covered, getting back, at least one activity. */
export const readiness = (t: Trip) => {
  const bs = bookingsFor(t.id)
  const transport = bs.filter((b) => b.type === 'flight' || b.type === 'train')
  const checks = {
    outbound: transport.some((b) => b.start.slice(0, 10) === t.start),
    stay: nights(t) > 0 && missingNights(t).length === 0,
    return: transport.some((b) => b.start.slice(0, 10) === t.end),
    activities: bs.some((b) => b.type === 'museum' || b.type === 'tour' || b.type === 'restaurant'),
  }
  const done = Object.values(checks).filter(Boolean).length
  return { checks, done, total: 4, missing: 4 - done }
}

export const gaps = (): Gap[] =>
  upcomingTrips().flatMap((t) =>
    missingNights(t).map((night) => {
      const lastHotel = bookingsFor(t.id).filter((b) => b.type === 'hotel').at(-1)
      return {
        tripId: t.id,
        kind: 'stay' as const,
        date: night,
        title: `Hotel missing for ${fmtDay(night)}`,
        detail: lastHotel
          ? `${t.city} trip · you check out of ${lastHotel.title} on ${fmtDay(lastHotel.end!)} and fly home the next day`
          : `${t.city} trip · no place to stay booked yet`,
      }
    }),
  )

export const deadlines = (limit = 3): Deadline[] => {
  const items: Deadline[] = []
  for (const b of bookings) {
    if (b.freeCancellationUntil)
      items.push({ date: b.freeCancellationUntil, title: 'Free cancellation ends', subtitle: b.title, bookingId: b.id })
    if (b.checkInOpens && !b.hasPass)
      items.push({ date: b.checkInOpens, title: 'Online check-in opens', subtitle: `${b.provider} · ${b.title.split('·')[1]?.trim() ?? b.title}`, bookingId: b.id })
  }
  items.push(...extraDeadlines)
  return items.filter((i) => daysUntil(i.date) >= 0).sort((a, b) => a.date.localeCompare(b.date)).slice(0, limit)
}

export const recentlyAdded = (limit = 3) => [...bookings].sort((a, b) => b.addedAt.localeCompare(a.addedAt)).slice(0, limit)

export const stats = () => {
  const up = upcomingTrips()
  return {
    upcoming: up.length,
    bookings: up.reduce((n, t) => n + bookingsFor(t.id).length, 0),
    countries: new Set(up.map((t) => t.countryCode)).size,
  }
}

/* ---------- formatting ---------- */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export const fmtDay = (iso: string) => {
  const x = d(iso)
  return `${x.getDate()} ${MONTHS[x.getMonth()]}`
}
export const fmtWeekday = (iso: string) => WEEKDAYS[d(iso).getDay()]
export const fmtTime = (iso: string) => iso.slice(11, 16)

export const fmtRange = (t: Trip, withYear = false) => {
  const a = d(t.start)
  const b = d(t.end)
  const year = withYear ? ` ${b.getFullYear()}` : ''
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()}–${b.getDate()} ${MONTHS[b.getMonth()]}${year}`
    : `${a.getDate()} ${MONTHS[a.getMonth()]} – ${b.getDate()} ${MONTHS[b.getMonth()]}${year}`
}

export const fmtLongToday = () => {
  const x = today()
  const long = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][x.getDay()]
  const month = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][x.getMonth()]
  return `${long}, ${x.getDate()} ${month}`
}

export const relativeAdded = (iso: string) => {
  // demo clock: 30 Oct, 18:05
  const now = new Date(DEMO_TODAY + 'T18:05')
  const diffH = Math.round((now.getTime() - new Date(iso).getTime()) / 3600_000)
  if (diffH < 24) return `${Math.max(1, diffH)}h ago`
  const days = Math.round(diffH / 24)
  return days === 1 ? 'Yesterday' : `${days} days ago`
}

export const sourceLabel = (b: Booking) =>
  b.source === 'Manual' ? 'Added manually' : b.source === 'Booking.com' ? 'Imported from Booking.com' : b.source === 'PDF' ? 'Imported from PDF' : 'Imported from email'
