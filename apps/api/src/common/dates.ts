/**
 * Date helpers for calendar dates ("2026-11-12") and local date-times ("2026-11-12T08:40").
 * All arithmetic is done in UTC so that the server's time zone never shifts a day.
 */
const DAY = 86_400_000;
const toUtc = (iso: string) =>
  Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));

export const dateOf = (isoDateTime: string) => isoDateTime.slice(0, 10);
export const daysBetween = (a: string, b: string) =>
  Math.round((toUtc(b) - toUtc(a)) / DAY);
export const addDays = (iso: string, n: number) =>
  new Date(toUtc(iso) + n * DAY).toISOString().slice(0, 10);
export const todayIso = () => new Date().toISOString().slice(0, 10);

/** Inclusive list of dates from a to b. */
export const dateRange = (a: string, b: string) => {
  const out: string[] = [];
  for (let i = 0; i <= daysBetween(a, b); i++) out.push(addDays(a, i));
  return out;
};

/** "2026-11-12 08:40:00" (Postgres) → "2026-11-12T08:40" (API) */
export const toApiDateTime = (pg: string | null) =>
  pg ? pg.replace(' ', 'T').slice(0, 16) : null;
/** "2026-11-12T08:40" (API) → "2026-11-12 08:40:00" (Postgres) */
export const toPgDateTime = (api: string) => {
  const [d, t = '00:00'] = api.split('T');
  return `${d} ${t.length === 5 ? `${t}:00` : t.slice(0, 8)}`;
};

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
/** "2026-11-15" → "15 Nov" */
export const fmtDay = (iso: string) =>
  `${+iso.slice(8, 10)} ${MONTHS[+iso.slice(5, 7) - 1]}`;
