import type { cities, reservations, tripMembers, trips } from '../db/schema';
import { toApiDateTime } from '../common/dates';
import type { PlanReservation, PlanTrip } from './planning';

type TripRow = typeof trips.$inferSelect;
type CityRow = typeof cities.$inferSelect;
type ReservationRow = typeof reservations.$inferSelect;
type Role = (typeof tripMembers.$inferSelect)['role'];

export const planTrip = (t: TripRow, c: CityRow): PlanTrip => ({
  id: t.id,
  city: c.name,
  startDate: t.startDate,
  endDate: t.endDate,
});

/** Reservation as the API returns it (local date-times as "2026-11-12T08:40"). */
export const toReservation = (r: ReservationRow) => ({
  id: r.id,
  tripId: r.tripId,
  type: r.type,
  title: r.title,
  provider: r.provider,
  source: r.source,
  startAt: toApiDateTime(r.startAt)!,
  endAt: toApiDateTime(r.endAt),
  location: r.location,
  ref: r.ref,
  priceCents: r.priceCents,
  currency: r.currency,
  paid: r.paid,
  status: r.status,
  freeCancellationUntil: r.freeCancellationUntil,
  checkInOpens: r.checkInOpens,
  guests: r.guests,
  hasPass: r.hasPass,
  /** fields the import was unsure about — show "Please check" next to them */
  needsCheck: Object.entries(r.fieldConfidence ?? {})
    .filter(([, v]) => v !== 'high')
    .map(([k]) => k),
  addedAt: r.createdAt,
});
export type ApiReservation = ReturnType<typeof toReservation> & PlanReservation;

export const toTrip = (t: TripRow, c: CityRow, role: Role) => ({
  id: t.id,
  slug: t.slug,
  city: {
    id: c.id,
    name: c.name,
    country: c.country,
    countryCode: c.countryCode,
    lat: c.lat,
    lon: c.lon,
    liveGuideEnabled: c.liveGuideEnabled,
  },
  startDate: t.startDate,
  endDate: t.endDate,
  travelers: t.travelers,
  coverPhotoUrl: t.coverPhotoUrl,
  coverPhotoCredit: t.coverPhotoCredit,
  role,
});
