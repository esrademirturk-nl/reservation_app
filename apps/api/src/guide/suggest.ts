/**
 * Suggestion rules — pure functions, no database.
 * 1. Fix your trip: the gaps (missing nights, no way there/back) with a search link.
 * 2. Fill your free time: windows of 2 h or more between 09:00 and 21:00, with places that fit.
 * 3. Don't miss: the city's top places that are not in the plan yet.
 */
import { dateOf, fmtDay } from '../common/dates';
import type { Gap } from '../trips/planning';

export interface Busy {
  start: string; // "2026-11-13T10:00"
  end: string;
}
export interface FreeWindow {
  date: string;
  from: string; // "13:00"
  to: string;
  minutes: number;
}

const mins = (hhmm: string) => +hhmm.slice(0, 2) * 60 + +hhmm.slice(3, 5);
const hhmm = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

/**
 * Free windows of at least `minMinutes` on each day. The arrival day starts 90 min after
 * landing, the departure day ends 3 h before leaving.
 */
export function freeWindows(
  days: string[],
  busy: Busy[],
  opts: {
    dayStart?: string;
    dayEnd?: string;
    minMinutes?: number;
    arrival?: string | null;
    departure?: string | null;
  } = {},
): FreeWindow[] {
  const { dayStart = '09:00', dayEnd = '21:00', minMinutes = 120 } = opts;
  const out: FreeWindow[] = [];
  for (const date of days) {
    let open = mins(dayStart);
    let close = mins(dayEnd);
    if (opts.arrival && dateOf(opts.arrival) === date)
      open = Math.max(open, mins(opts.arrival.slice(11)) + 90);
    if (opts.departure && dateOf(opts.departure) === date)
      close = Math.min(close, mins(opts.departure.slice(11)) - 180);
    const blocks = busy
      .filter((b) => dateOf(b.start) === date)
      .map(
        (b) =>
          [
            mins(b.start.slice(11)),
            dateOf(b.end) === date ? mins(b.end.slice(11)) : 24 * 60,
          ] as const,
      )
      .sort((a, b) => a[0] - b[0]);
    let cursor = open;
    for (const [s, e] of [...blocks, [close, close] as const]) {
      const end = Math.min(s, close);
      if (end - cursor >= minMinutes)
        out.push({
          date,
          from: hhmm(cursor),
          to: hhmm(end),
          minutes: end - cursor,
        });
      cursor = Math.max(cursor, e);
      if (cursor >= close) break;
    }
  }
  return out;
}

export interface CandidatePlace {
  id: string;
  name: string;
  kind: string;
  category: 'sight' | 'museum' | 'food' | 'coffee' | 'walk';
  visitMinutes: number;
  priceLevel: number | null;
  rank: number;
  photoUrl: string | null;
  hasAudioGuide: boolean;
}

const price = (n: number | null) => (n ? '€'.repeat(n) : null);
const duration = (m: number) =>
  m < 60 ? `${m} min` : `${(m / 60).toFixed(m % 60 ? 1 : 0)} h`;

/** Up to `limit` places for a free window: they must fit in it, match the budget, food first around lunch. */
export function placesForWindow(
  w: FreeWindow,
  candidates: CandidatePlace[],
  budgetLevel: number,
  limit = 3,
  /** from the user's stated interests: negative = show earlier */
  boost: Partial<Record<CandidatePlace['category'], number>> = {},
) {
  const lunch = mins(w.from) <= 13 * 60 && mins(w.to) >= 12 * 60 + 30;
  const evening = mins(w.to) >= 19 * 60;
  return candidates
    .filter(
      (p) =>
        p.visitMinutes <= w.minutes &&
        (p.priceLevel === null || p.priceLevel <= budgetLevel),
    )
    .map((p) => {
      let score = p.rank;
      if (lunch && p.category === 'food') score -= 50;
      if (p.category === 'coffee') score -= 5;
      if (evening && p.category === 'walk') score -= 30;
      if (!evening && p.category === 'walk') score += 30;
      score += boost[p.category] ?? 0;
      return { p, score };
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map(({ p }) => p);
}

export const placeFacts = (p: CandidatePlace) =>
  [p.kind, price(p.priceLevel), duration(p.visitMinutes)].filter(
    (x): x is string => !!x,
  );

/** A search link for a gap — Waypad suggests where to look; it does not sell bookings. */
export function gapAction(g: Gap, city: string, tripEnd: string) {
  if (g.kind === 'stay') {
    const checkout = g.date < tripEnd ? nextDay(g.date) : tripEnd;
    const q = new URLSearchParams({ ss: city, checkin: g.date, checkout });
    return {
      type: 'link' as const,
      label: 'Search hotels',
      url: `https://www.booking.com/searchresults.html?${q.toString()}`,
    };
  }
  const q = new URLSearchParams({
    q: `${g.title.startsWith('No way home') ? 'Flights from' : 'Flights to'} ${city} on ${g.date}`,
  });
  return {
    type: 'link' as const,
    label: 'Search flights',
    url: `https://www.google.com/travel/flights?${q.toString()}`,
  };
}

const nextDay = (iso: string) =>
  new Date(Date.parse(`${iso}T12:00:00Z`) + 86_400_000)
    .toISOString()
    .slice(0, 10);

export const windowLabel = (w: FreeWindow, dayNumber: number) =>
  `Day ${dayNumber} · ${fmtDay(w.date)} · ${w.from}–${w.to} free`;

const INTEREST_CATEGORIES: Record<string, CandidatePlace['category'][]> = {
  food: ['food', 'coffee'],
  museums: ['museum'],
  history: ['sight', 'museum'],
  art: ['museum'],
  architecture: ['sight'],
  nature: ['walk'],
  local_life: ['walk', 'food'],
  nightlife: ['walk'],
};

/**
 * Turns stated preferences into picking rules. Relaxed travellers get fewer, longer gaps;
 * packed travellers get more suggestions in shorter gaps. Each matching interest moves a category up.
 */
export function personalise(
  prefs: { pace: string | null; interests: string[] } | null,
) {
  const boost: Partial<Record<CandidatePlace['category'], number>> = {};
  for (const i of prefs?.interests ?? [])
    for (const c of INTEREST_CATEGORIES[i] ?? [])
      boost[c] = (boost[c] ?? 0) - 15;
  const pace = prefs?.pace ?? 'balanced';
  return {
    boost,
    picksPerWindow: pace === 'relaxed' ? 2 : 3,
    minWindowMinutes: pace === 'relaxed' ? 150 : pace === 'packed' ? 90 : 120,
  };
}
