/**
 * Trip planning rules — pure functions, no database.
 * Same rules as the web demo (apps/web/src/lib/trips.ts), so both always agree.
 */
import {
  addDays,
  dateOf,
  dateRange,
  daysBetween,
  fmtDay,
} from '../common/dates';

export interface PlanTrip {
  id: string;
  city: string;
  startDate: string; // arrival day
  endDate: string; // departure day
}

export interface PlanReservation {
  id: string;
  type: 'flight' | 'hotel' | 'train' | 'museum' | 'restaurant' | 'tour';
  title: string;
  provider: string;
  startAt: string; // "2026-11-12T08:40"
  endAt: string | null;
  status: 'pending' | 'confirmed' | 'cancelled';
  freeCancellationUntil: string | null;
  checkInOpens: string | null;
  hasPass: boolean;
}

const active = <R extends PlanReservation>(rs: R[]) =>
  rs
    .filter((r) => r.status !== 'cancelled')
    .sort((a, b) => a.startAt.localeCompare(b.startAt));

export const nights = (t: PlanTrip) => daysBetween(t.startDate, t.endDate);

/** The nights of the trip: arrival day up to the day before departure. */
export const tripNights = (t: PlanTrip) =>
  nights(t) > 0 ? dateRange(t.startDate, addDays(t.endDate, -1)) : [];

/** Nights with no hotel booked. */
export const missingNights = (t: PlanTrip, rs: PlanReservation[]) => {
  const covered = new Set<string>();
  for (const h of active(rs).filter((r) => r.type === 'hotel' && r.endAt)) {
    const from = dateOf(h.startAt);
    const to = addDays(dateOf(h.endAt!), -1);
    if (to >= from) dateRange(from, to).forEach((n) => covered.add(n));
  }
  return tripNights(t).filter((n) => !covered.has(n));
};

/** Readiness = 4 checks: getting there, every night covered, getting back, at least one activity. */
export const readiness = (t: PlanTrip, rs: PlanReservation[]) => {
  const bs = active(rs);
  const transport = bs.filter((r) => r.type === 'flight' || r.type === 'train');
  const checks = {
    outbound: transport.some((r) => dateOf(r.startAt) === t.startDate),
    stay: nights(t) > 0 && missingNights(t, bs).length === 0,
    return: transport.some((r) => dateOf(r.startAt) === t.endDate),
    activities: bs.some(
      (r) =>
        r.type === 'museum' || r.type === 'tour' || r.type === 'restaurant',
    ),
  };
  const done = Object.values(checks).filter(Boolean).length;
  return { checks, done, total: 4, missing: 4 - done };
};

export interface Gap {
  tripId: string;
  kind: 'stay' | 'transport';
  date: string;
  title: string;
  detail: string;
}

export const gaps = (t: PlanTrip, rs: PlanReservation[]): Gap[] => {
  const bs = active(rs);
  const r = readiness(t, bs);
  const lastHotel = bs.filter((b) => b.type === 'hotel' && b.endAt).at(-1);
  const out: Gap[] = missingNights(t, bs).map((night) => ({
    tripId: t.id,
    kind: 'stay',
    date: night,
    title: `Hotel missing for ${fmtDay(night)}`,
    detail: lastHotel
      ? `${t.city} trip · you check out of ${lastHotel.title} on ${fmtDay(dateOf(lastHotel.endAt!))}`
      : `${t.city} trip · no place to stay booked yet`,
  }));
  if (!r.checks.outbound)
    out.push({
      tripId: t.id,
      kind: 'transport',
      date: t.startDate,
      title: `No way to get to ${t.city} yet`,
      detail: `${t.city} trip · add a flight or train for ${fmtDay(t.startDate)}`,
    });
  if (!r.checks.return)
    out.push({
      tripId: t.id,
      kind: 'transport',
      date: t.endDate,
      title: `No way home from ${t.city} yet`,
      detail: `${t.city} trip · add a flight or train for ${fmtDay(t.endDate)}`,
    });
  // same day: getting there comes before the night's stay
  return out.sort(
    (a, b) => a.date.localeCompare(b.date) || (a.kind === 'transport' ? -1 : 1),
  );
};

export interface Deadline {
  date: string;
  kind: 'free_cancellation' | 'check_in';
  title: string;
  subtitle: string;
  reservationId: string;
}

export const deadlines = (rs: PlanReservation[], today: string): Deadline[] => {
  const out: Deadline[] = [];
  for (const r of active(rs)) {
    if (r.freeCancellationUntil)
      out.push({
        date: r.freeCancellationUntil,
        kind: 'free_cancellation',
        title: 'Free cancellation ends',
        subtitle: r.title,
        reservationId: r.id,
      });
    if (r.checkInOpens && !r.hasPass)
      out.push({
        date: r.checkInOpens,
        kind: 'check_in',
        title: 'Online check-in opens',
        subtitle: `${r.provider} · ${r.title.split('·')[1]?.trim() ?? r.title}`,
        reservationId: r.id,
      });
  }
  return out
    .filter((d) => d.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
};

/** Timeline events: hotels appear twice (check-in and check-out). */
export const timeline = <R extends PlanReservation>(rs: R[]) =>
  active(rs)
    .flatMap((r) =>
      r.type === 'hotel' && r.endAt
        ? [
            { at: r.startAt, label: 'Check-in', reservation: r },
            { at: r.endAt, label: 'Check-out', reservation: r },
          ]
        : [{ at: r.startAt, label: '', reservation: r }],
    )
    .sort((a, b) => a.at.localeCompare(b.at));

/** The trip whose dates contain the reservation's start (used to suggest a trip for new bookings). */
export const matchTrip = <T extends PlanTrip>(trips: T[], startAt: string) => {
  const day = dateOf(startAt);
  return trips.find((t) => day >= t.startDate && day <= t.endDate) ?? null;
};
