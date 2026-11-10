import { addDays } from '../../common/dates';
import type {
  BookingType,
  Confidence,
  ExtractedBooking,
  ExtractionInput,
  ExtractionProvider,
} from './types';

/**
 * A simple, offline booking reader based on labels and patterns
 * ("Booking reference: KX7Q2M", "Check-in: 12 November 2026 15:00", …).
 * Used in tests and when no AI key is configured. It is honest about what it is unsure of:
 * every guessed or missing field is marked "medium" or "check".
 */
const MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  sept: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};
const MONTH =
  '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) =>
  m >= 1 && m <= 12 && d >= 1 && d <= 31 ? `${y}-${pad(m)}-${pad(d)}` : null;

/** All dates in a line, as "YYYY-MM-DD", in order of appearance. */
export function findDates(line: string): string[] {
  const hits: { at: number; date: string | null }[] = [];
  const push = (re: RegExp, f: (m: RegExpExecArray) => string | null) => {
    for (let m = re.exec(line); m; m = re.exec(line))
      hits.push({ at: m.index, date: f(m) });
  };
  push(/\b(\d{4})-(\d{2})-(\d{2})/g, (m) => iso(+m[1], +m[2], +m[3]));
  push(
    new RegExp(
      `\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+${MONTH}\\.?,?\\s+(\\d{4})`,
      'gi',
    ),
    (m) => iso(+m[3], MONTHS[m[2].slice(0, 3).toLowerCase()], +m[1]),
  );
  push(
    new RegExp(
      `\\b${MONTH}\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})`,
      'gi',
    ),
    (m) => iso(+m[3], MONTHS[m[1].slice(0, 3).toLowerCase()], +m[2]),
  );
  // 12/11/2026 or 12.11.2026 — day first (European tickets)
  push(/\b(\d{1,2})[/.](\d{1,2})[/.](\d{4})\b/g, (m) =>
    iso(+m[3], +m[2], +m[1]),
  );
  return hits
    .filter((h): h is { at: number; date: string } => !!h.date)
    .sort((a, b) => a.at - b.at)
    .map((h) => h.date);
}

const findTime = (line: string) =>
  /\b([01]?\d|2[0-3])[:.h]([0-5]\d)\b(?!\s*(?:kg|%))/.exec(
    line.replace(/\d{4}-\d{2}-\d{2}/g, ''),
  );
const timeOf = (line: string) => {
  const m = findTime(line);
  return m ? `${pad(+m[1])}:${m[2]}` : null;
};

/** "1.234,56" / "1,234.56" / "238" → cents */
export function parseAmount(raw: string): number | null {
  let s = raw.trim();
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma > -1 && lastDot > -1)
    s =
      lastComma > lastDot
        ? s.replace(/\./g, '').replace(',', '.')
        : s.replace(/,/g, '');
  else if (lastComma > -1)
    s = /,\d{2}$/.test(s) ? s.replace(',', '.') : s.replace(/,/g, '');
  else if (lastDot > -1 && !/\.\d{2}$/.test(s)) s = s.replace(/\./g, '');
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

const CURRENCY: Record<string, string> = {
  '€': 'EUR',
  $: 'USD',
  '£': 'GBP',
  '₺': 'TRY',
};

const PROVIDERS = [
  'KLM',
  'Transavia',
  'easyJet',
  'Ryanair',
  'ITA Airways',
  'Lufthansa',
  'Turkish Airlines',
  'Pegasus',
  'Air France',
  'Vueling',
  'British Airways',
  'Booking.com',
  'Airbnb',
  'Expedia',
  'Hotels.com',
  'Trenitalia',
  'Italo',
  'NS International',
  'Eurostar',
  'Deutsche Bahn',
  'SNCF',
  'Renfe',
  'GetYourGuide',
  'Tiqets',
  'TheFork',
  'OpenTable',
  'Viator',
  'Musement',
];

const TYPE_WORDS: [BookingType, RegExp][] = [
  [
    'flight',
    /\b(flight|boarding|airline|PNR|gate|departure airport|e-?ticket number)\b/gi,
  ],
  [
    'hotel',
    /\b(hotel|check-?in|check-?out|night|room|property|accommodation|stay)s?\b/gi,
  ],
  ['train', /\b(train|rail|coach|carriage|platform|station)s?\b/gi],
  [
    'museum',
    /\b(museum|gallery|admission|entry ticket|exhibition|colosseum)s?\b/gi,
  ],
  [
    'restaurant',
    /\b(restaurant|table for|dinner|lunch|reservation for \d)\b/gi,
  ],
  ['tour', /\b(tour|guided|excursion|walking tour|experience)s?\b/gi],
];

const LABEL = {
  ref: /\b(?:booking|confirmation|reservation|order|ticket)\s*(?:reference|number|code|no\.?|id)\b|\bPNR\b|\bbooking ref\b/i,
  depart: /\b(?:depart(?:ure|s)?|outbound|return flight|leaves)\b/i,
  arrive: /\b(?:arriv(?:al|es))\b/i,
  checkIn: /\bcheck-?in\b(?!\s*(?:opens|online|from \d{1,2}:))/i,
  checkOut: /\bcheck-?out\b/i,
  when: /\b(?:date|time|visit|entry|slot|starts?|when|reservation for)\b/i,
  price:
    /\b(?:total(?:\s+price)?|amount(?:\s+paid)?|price|grand total|you paid)\b/i,
  location:
    /^(?:address|location|venue|meeting point|station|where)\s*[:-]\s*(.+)$/i,
  name: /^(?:hotel|property|accommodation|attraction|event|tour|restaurant|activity|ticket)\s*:\s*(.+)$/i,
  freeCancel: /free cancell?ation\s+(?:until|before|till|up to)/i,
  checkInOpens: /(?:online\s+)?check-?in\s+(?:opens|available from)/i,
};

const valueAfterLabel = (line: string, label: RegExp) => {
  const m = label.exec(line);
  return m ? line.slice(m.index + m[0].length).replace(/^[\s:#.-]+/, '') : null;
};

export class RuleBasedExtractor implements ExtractionProvider {
  readonly name = 'rules';

  extract(input: ExtractionInput): Promise<ExtractedBooking[]> {
    return Promise.resolve(this.read(`${input.hint ?? ''}\n${input.text}`));
  }

  private read(text: string): ExtractedBooking[] {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    const all = lines.join('\n');

    // type: the group of words that appears most often
    const scores = TYPE_WORDS.map(
      ([t, re]) => [t, (all.match(re) ?? []).length] as const,
    ).sort((a, b) => b[1] - a[1]);
    if (scores[0][1] === 0) return [];
    const type = scores[0][0];
    const typeConf: Confidence =
      scores[0][1] >= 2 && scores[0][1] > scores[1][1] ? 'high' : 'medium';

    // the date (and time) on a labelled line, or on the line right after it
    const dated = (label: RegExp, from = 0) => {
      for (let i = from; i < lines.length; i++) {
        if (!label.test(lines[i])) continue;
        for (const l of [lines[i], lines[i + 1] ?? '']) {
          const d = findDates(l)[0];
          if (d) return { i, date: d, time: timeOf(l) };
        }
      }
      return null;
    };
    const at = (
      x: { date: string; time: string | null } | null,
      fallback: string,
    ) => (x ? `${x.date}T${x.time ?? fallback}` : null);

    // reference
    let ref: string | null = null;
    for (const l of lines) {
      const v = valueAfterLabel(l, LABEL.ref);
      const m = v && /^([A-Z0-9][A-Z0-9.-]{3,24}[A-Z0-9])/i.exec(v);
      if (m && /\d|^[A-Z]{5,8}$/.test(m[1])) {
        ref = m[1].toUpperCase();
        break;
      }
    }

    // provider
    const provider = PROVIDERS.find((p) =>
      new RegExp(`\\b${p.replace('.', '\\.')}\\b`, 'i').test(all),
    );

    // price
    let priceCents: number | null = null;
    let currency: string | null = null;
    for (const l of lines.filter((x) => LABEL.price.test(x)).reverse()) {
      const m =
        /(€|\$|£|₺|\b(?:EUR|USD|GBP|TRY)\b)?\s*(\d[\d.,]*\d|\d)\s*(€|\b(?:EUR|USD|GBP|TRY)\b)?/.exec(
          valueAfterLabel(l, LABEL.price) ?? '',
        );
      if (m) {
        priceCents = parseAmount(m[2]);
        const c = m[1] ?? m[3];
        currency = c ? (CURRENCY[c] ?? c.toUpperCase()) : null;
        break;
      }
    }

    const guestsMatch =
      /\b(\d{1,2})\s*(?:adults?|guests?|passengers?|persons?|people|travell?ers?)\b/i.exec(
        all,
      );
    const guests = guestsMatch ? +guestsMatch[1] : null;
    const freeCancel = dated(LABEL.freeCancel)?.date ?? null;
    const opens = dated(LABEL.checkInOpens)?.date ?? null;

    let location = '';
    let name: string | null = null;
    for (const l of lines) {
      location ||= LABEL.location.exec(l)?.[1] ?? '';
      name ??= LABEL.name.exec(l)?.[1] ?? null;
    }

    const base = {
      provider: provider ?? 'Unknown',
      ref: ref ?? '',
      priceCents,
      currency,
      guests,
      freeCancellationUntil: freeCancel,
    };
    const conf = (
      extra: ExtractedBooking['confidence'],
    ): ExtractedBooking['confidence'] => ({
      type: typeConf,
      provider: provider ? 'high' : 'check',
      ref: ref ? 'high' : 'check',
      priceCents: priceCents !== null ? 'high' : 'check',
      ...extra,
    });

    if (type === 'flight') {
      // one booking per "Departure" line (outbound + return share the same reference)
      const routes = [
        ...all.matchAll(
          /\b([A-Z]{3})\b\s*(?:→|->|–|—|\bto\b|-)\s*\b([A-Z]{3})\b/g,
        ),
      ].map((m) => `${m[1]} → ${m[2]}`);
      const out: ExtractedBooking[] = [];
      let from = 0;
      for (let guard = 0; guard < 10; guard++) {
        const dep = dated(LABEL.depart, from);
        if (!dep) break;
        from = dep.i + 1;
        const startAt = `${dep.date}T${dep.time ?? '00:00'}`;
        // "Outbound flight" and "Departure:" can describe the same leg — keep it once
        if (
          out.some(
            (b) =>
              b.startAt.slice(0, 10) === dep.date &&
              (!dep.time || b.startAt === startAt),
          )
        )
          continue;
        const arr = dated(LABEL.arrive, dep.i);
        const route = routes[out.length] ?? routes[0];
        out.push({
          ...base,
          type,
          title: `${provider ?? 'Flight'} · ${route ?? 'route unknown'}`,
          startAt,
          endAt: at(arr, '00:00'),
          location: location || route || '',
          checkInOpens: opens ?? addDays(dep.date, -1),
          confidence: conf({
            title: route ? 'high' : 'check',
            startAt: dep.time ? 'high' : 'check',
            endAt: arr ? 'medium' : 'check',
            location: route ? 'medium' : 'check',
            checkInOpens: opens ? 'high' : 'medium',
          }),
        });
      }
      return out;
    }

    const [startLabel, endLabel] =
      type === 'hotel'
        ? [LABEL.checkIn, LABEL.checkOut]
        : type === 'train'
          ? [LABEL.depart, LABEL.arrive]
          : [LABEL.when, LABEL.arrive];
    const start =
      dated(startLabel) ?? (type === 'hotel' ? null : firstDate(lines));
    if (!start) return [];
    const end =
      type === 'museum' || type === 'restaurant' ? null : dated(endLabel);
    const startDefault = type === 'hotel' ? '15:00' : '00:00';
    const title =
      name ??
      (type === 'hotel'
        ? lines.find((l) => /\bhotel\b/i.test(l) && l.length <= 80)
        : null) ??
      `${provider ?? 'Booking'} ${type}`;

    return [
      {
        ...base,
        type,
        title: title.slice(0, 120),
        startAt: `${start.date}T${start.time ?? startDefault}`,
        endAt: at(end, type === 'hotel' ? '11:00' : '00:00'),
        location,
        checkInOpens: null,
        confidence: conf({
          title: name ? 'high' : 'medium',
          startAt: start.time ? 'high' : 'medium',
          endAt: end
            ? end.time
              ? 'high'
              : 'medium'
            : type === 'hotel'
              ? 'check'
              : 'high',
          location: location ? 'high' : 'check',
        }),
      },
    ];
  }
}

const firstDate = (lines: string[]) => {
  for (const l of lines) {
    const d = findDates(l)[0];
    if (d) return { i: 0, date: d, time: timeOf(l) };
  }
  return null;
};
