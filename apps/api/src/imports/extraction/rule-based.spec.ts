import { findDates, parseAmount, RuleBasedExtractor } from './rule-based';

const read = (text: string, hint?: string) =>
  new RuleBasedExtractor().extract({ text, hint });

describe('RuleBasedExtractor', () => {
  it('reads dates in common formats', () => {
    expect(findDates('Thu 12 Nov 2026, 08:40')).toEqual(['2026-11-12']);
    expect(findDates('November 16, 2026')).toEqual(['2026-11-16']);
    expect(findDates('from 2026-11-12 to 15/11/2026')).toEqual([
      '2026-11-12',
      '2026-11-15',
    ]);
  });

  it('reads amounts with either decimal separator', () => {
    expect(parseAmount('238')).toBe(23800);
    expect(parseAmount('1.234,50')).toBe(123450);
    expect(parseAmount('1,234.50')).toBe(123450);
    expect(parseAmount('412,00')).toBe(41200);
  });

  it('reads a flight confirmation with outbound and return', async () => {
    const res = await read(
      [
        'Your KLM booking is confirmed',
        'Booking reference: KX7Q2M',
        'Passengers: 2 adults',
        'Outbound flight KL1605 AMS → FCO',
        'Departure: Thu 12 Nov 2026 08:40 Amsterdam Schiphol',
        'Arrival: Thu 12 Nov 2026 10:55 Rome Fiumicino',
        'Return flight KL1606 FCO → AMS',
        'Departure: Mon 16 Nov 2026 18:05 Rome Fiumicino',
        'Arrival: Mon 16 Nov 2026 20:35 Amsterdam Schiphol',
        'Total price: € 476,00',
      ].join('\n'),
    );
    expect(res).toHaveLength(2);
    expect(res[0]).toMatchObject({
      type: 'flight',
      provider: 'KLM',
      ref: 'KX7Q2M',
      title: 'KLM · AMS → FCO',
      startAt: '2026-11-12T08:40',
      endAt: '2026-11-12T10:55',
      checkInOpens: '2026-11-11',
      guests: 2,
      priceCents: 47600,
      currency: 'EUR',
    });
    expect(res[1]).toMatchObject({
      title: 'KLM · FCO → AMS',
      startAt: '2026-11-16T18:05',
      endAt: '2026-11-16T20:35',
    });
    expect(res[0].confidence).toMatchObject({
      ref: 'high',
      startAt: 'high',
      checkInOpens: 'medium',
    });
  });

  it('reads a hotel booking and flags what is missing', async () => {
    const [b] = await read(
      [
        'Booking.com',
        'Your booking at Hotel Roma Centro is confirmed.',
        'Confirmation number: 4417.892.113',
        'Check-in: Thursday, 12 November 2026 (from 15:00)',
        'Check-out: Sunday, 15 November 2026 (until 11:00)',
        'Address: Via Cavour 23, 00184 Rome, Italy',
        'Free cancellation until 5 November 2026',
        '2 guests, 3 nights',
      ].join('\n'),
    );
    expect(b).toMatchObject({
      type: 'hotel',
      provider: 'Booking.com',
      title: 'Your booking at Hotel Roma Centro is confirmed.',
      ref: '4417.892.113',
      startAt: '2026-11-12T15:00',
      endAt: '2026-11-15T11:00',
      location: 'Via Cavour 23, 00184 Rome, Italy',
      freeCancellationUntil: '2026-11-05',
      guests: 2,
      priceCents: null,
    });
    expect(b.confidence.priceCents).toBe('check');
    expect(b.confidence.title).toBe('medium');
  });

  it('reads a museum ticket', async () => {
    const [b] = await read(
      [
        'Tiqets',
        'Attraction: Colosseum, Roman Forum & Palatine Hill',
        'Order number: TQ-88231',
        'Date: 13/11/2026',
        'Time slot: 10:30',
        'Total: 36.00 EUR',
        '2 adults',
      ].join('\n'),
    );
    expect(b).toMatchObject({
      type: 'museum',
      title: 'Colosseum, Roman Forum & Palatine Hill',
      provider: 'Tiqets',
      ref: 'TQ-88231',
      startAt: '2026-11-13T00:00',
      priceCents: 3600,
      currency: 'EUR',
    });
    expect(b.confidence.startAt).toBe('medium');
  });

  it('returns nothing for text that is not a booking', async () => {
    expect(await read('Hi Esra, see you at the meeting tomorrow!')).toEqual([]);
  });
});
