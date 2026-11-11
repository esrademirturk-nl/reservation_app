import {
  deadlines,
  gaps,
  matchTrip,
  missingNights,
  readiness,
  timeline,
  tripNights,
  type PlanReservation,
} from './planning';

const rome = {
  id: 'rome',
  city: 'Rome',
  startDate: '2026-11-12',
  endDate: '2026-11-16',
};
const base = {
  provider: 'X',
  endAt: null,
  status: 'confirmed' as const,
  freeCancellationUntil: null,
  checkInOpens: null,
  hasPass: false,
};
const r = (
  p: Partial<PlanReservation> &
    Pick<PlanReservation, 'id' | 'type' | 'startAt'>,
): PlanReservation => ({ title: p.id, ...base, ...p });

const flightOut = r({
  id: 'out',
  type: 'flight',
  title: 'KLM · AMS → FCO',
  provider: 'KLM',
  startAt: '2026-11-12T08:40',
  checkInOpens: '2026-11-11',
});
const flightBack = r({
  id: 'back',
  type: 'flight',
  startAt: '2026-11-16T18:00',
});
const hotel = r({
  id: 'hotel',
  type: 'hotel',
  title: 'Hotel Roma Centro',
  startAt: '2026-11-12T15:00',
  endAt: '2026-11-15T11:00',
  freeCancellationUntil: '2026-11-05',
});
const museum = r({
  id: 'colosseum',
  type: 'museum',
  startAt: '2026-11-13T10:00',
});

describe('trip planning rules', () => {
  it('lists the nights from arrival to the night before departure', () => {
    expect(tripNights(rome)).toEqual([
      '2026-11-12',
      '2026-11-13',
      '2026-11-14',
      '2026-11-15',
    ]);
  });

  it('finds the night without a hotel (the Rome demo gap)', () => {
    expect(missingNights(rome, [hotel])).toEqual(['2026-11-15']);
  });

  it('ignores cancelled bookings', () => {
    const cancelled = { ...hotel, status: 'cancelled' as const };
    expect(missingNights(rome, [cancelled])).toHaveLength(4);
  });

  it('computes readiness as 4 checks', () => {
    expect(readiness(rome, [flightOut, hotel, museum])).toMatchObject({
      checks: { outbound: true, stay: false, return: false, activities: true },
      done: 2,
      missing: 2,
    });
    const fullHotel = { ...hotel, endAt: '2026-11-16T11:00' };
    expect(
      readiness(rome, [flightOut, fullHotel, museum, flightBack]).done,
    ).toBe(4);
  });

  it('describes gaps in plain words', () => {
    const g = gaps(rome, [flightOut, hotel, museum]);
    expect(g.map((x) => [x.kind, x.date, x.title])).toEqual([
      ['stay', '2026-11-15', 'Hotel missing for 15 Nov'],
      ['transport', '2026-11-16', 'No way home from Rome yet'],
    ]);
    expect(g[0].detail).toBe(
      'Rome trip · you check out of Hotel Roma Centro on 15 Nov',
    );
  });

  it('lists upcoming deadlines and hides check-in once a pass exists', () => {
    const d = deadlines([flightOut, hotel], '2026-10-30');
    expect(d.map((x) => [x.date, x.kind])).toEqual([
      ['2026-11-05', 'free_cancellation'],
      ['2026-11-11', 'check_in'],
    ]);
    expect(d[1].subtitle).toBe('KLM · AMS → FCO');
    expect(deadlines([{ ...flightOut, hasPass: true }], '2026-10-30')).toEqual(
      [],
    );
    expect(deadlines([hotel], '2026-11-06')).toEqual([]);
  });

  it('shows hotels twice on the timeline', () => {
    expect(
      timeline([museum, hotel]).map((e) => e.label || e.reservation.id),
    ).toEqual(['Check-in', 'colosseum', 'Check-out']);
  });

  it('suggests the trip whose dates contain the booking', () => {
    expect(matchTrip([rome], '2026-11-14T19:30')?.id).toBe('rome');
    expect(matchTrip([rome], '2026-11-17T09:00')).toBeNull();
  });
});
