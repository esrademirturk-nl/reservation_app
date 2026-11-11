import {
  freeWindows,
  gapAction,
  personalise,
  placesForWindow,
  type CandidatePlace,
} from './suggest';

const place = (
  p: Partial<CandidatePlace> & Pick<CandidatePlace, 'id' | 'category'>,
): CandidatePlace => ({
  name: p.id,
  kind: p.category,
  visitMinutes: 60,
  priceLevel: null,
  rank: 50,
  photoUrl: null,
  hasAudioGuide: false,
  ...p,
});

describe('suggestion rules', () => {
  it('finds the Rome demo free afternoon (Fri 13 Nov 13:00–16:00)', () => {
    const w = freeWindows(
      ['2026-11-13'],
      [
        { start: '2026-11-13T09:00', end: '2026-11-13T09:45' }, // breakfast
        { start: '2026-11-13T10:00', end: '2026-11-13T13:00' }, // Colosseum + Forum
        { start: '2026-11-13T16:00', end: '2026-11-13T17:00' },
        { start: '2026-11-13T17:30', end: '2026-11-13T18:00' }, // Trevi
        { start: '2026-11-13T19:30', end: '2026-11-13T21:00' }, // dinner
      ],
    );
    expect(w).toEqual([
      { date: '2026-11-13', from: '13:00', to: '16:00', minutes: 180 },
    ]);
  });

  it('keeps time free after landing and before the flight home', () => {
    const w = freeWindows(['2026-11-12', '2026-11-16'], [], {
      arrival: '2026-11-12T10:55',
      departure: '2026-11-16T18:05',
    });
    expect(w).toEqual([
      { date: '2026-11-12', from: '12:25', to: '21:00', minutes: 515 },
      { date: '2026-11-16', from: '09:00', to: '15:05', minutes: 365 },
    ]);
  });

  it('suggests food first at lunch, within budget and time', () => {
    const lunch = {
      date: '2026-11-13',
      from: '12:00',
      to: '14:00',
      minutes: 120,
    };
    const picks = placesForWindow(
      lunch,
      [
        place({ id: 'museum', category: 'museum', rank: 1, visitMinutes: 90 }),
        place({ id: 'trattoria', category: 'food', rank: 20, priceLevel: 2 }),
        place({ id: 'fancy', category: 'food', rank: 10, priceLevel: 3 }),
        place({
          id: 'vatican',
          category: 'museum',
          rank: 2,
          visitMinutes: 180,
        }),
      ],
      2,
    );
    expect(picks.map((p) => p.id)).toEqual(['trattoria', 'museum']);
  });

  it('links a missing night to a hotel search for that night', () => {
    const a = gapAction(
      { tripId: 't', kind: 'stay', date: '2026-11-15', title: '', detail: '' },
      'Rome',
      '2026-11-16',
    );
    expect(a.url).toBe(
      'https://www.booking.com/searchresults.html?ss=Rome&checkin=2026-11-15&checkout=2026-11-16',
    );
  });

  it('turns stated preferences into picking rules', () => {
    expect(personalise(null)).toEqual({
      boost: {},
      picksPerWindow: 3,
      minWindowMinutes: 120,
    });
    const relaxedFoodie = personalise({
      pace: 'relaxed',
      interests: ['food', 'history'],
    });
    expect(relaxedFoodie).toMatchObject({
      picksPerWindow: 2,
      minWindowMinutes: 150,
      boost: { food: -15, coffee: -15, sight: -15, museum: -15 },
    });

    const afternoon = {
      date: '2026-11-13',
      from: '15:00',
      to: '18:00',
      minutes: 180,
    };
    const options = [
      place({ id: 'museum', category: 'museum', rank: 10 }),
      place({ id: 'market', category: 'food', rank: 20 }),
    ];
    expect(placesForWindow(afternoon, options, 2, 1)[0].id).toBe('museum');
    expect(
      placesForWindow(
        afternoon,
        options,
        2,
        1,
        personalise({ pace: null, interests: ['food'] }).boost,
      )[0].id,
    ).toBe('market');
  });
});
