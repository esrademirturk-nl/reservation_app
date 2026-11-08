export interface Suggestion {
  id: string
  kind: string // e.g. "Hotel · 1 night"
  title: string
  facts: string[]
  why: string
  cta: string
  tags?: { label: string; tone: 'warn' | 'info' }[]
  photo: string
}

export interface SuggestionSection {
  id: string
  title: string
  badge: { label: string; tone: 'warn' | 'info' }
  items: Suggestion[]
}

const wiki = (path: string) => `https://upload.wikimedia.org/wikipedia/commons/thumb/${path}/640px-${path.split('/').pop()}`
const PHOTO = {
  hotel: wiki('3/3b/Via_Nazionale_-_Roma.jpg'),
  trattoria: wiki('6/6a/Spaghetti_alla_Carbonara.jpg'),
  capitoline: wiki('3/30/Piazza_del_Campidoglio_%28Rome%29.jpg'),
  coffee: wiki('4/45/A_small_cup_of_coffee.JPG'),
  vatican: wiki('0/03/Vatican_Museums_Spiral_Staircase_2012.jpg'),
  pantheon: wiki('a/a3/Pantheon_Rome_-_Front.jpg'),
  trastevere: wiki('d/d6/Trastevere_%28Rome%29.jpg'),
  prague: wiki('a/a7/Prague_%286365119737%29.jpg'),
  amsterdam: wiki('5/54/Amsterdam_Canals_%2823585867048%29.jpg'),
}

export const suggestions: Record<string, SuggestionSection[]> = {
  rome: [
    {
      id: 'fix', title: 'Fix your trip', badge: { label: '1 night missing · 15 Nov', tone: 'warn' },
      items: [
        { id: 'h-quirinale', kind: 'Hotel · 1 night', title: 'Hotel Quirinale', facts: ['4.4', '€145 / night', '4 min from Hotel Roma Centro'], why: "Same street as your hotel, so you won't need to cross the city with luggage.", cta: 'View & book', photo: PHOTO.hotel },
        { id: 'h-mediterraneo', kind: 'Hotel · 1 night', title: 'Hotel Mediterraneo', facts: ['4.5', '€152 / night', '6 min from Hotel Roma Centro'], why: 'Rooftop breakfast and free cancellation until 13 Nov.', cta: 'View & book', photo: PHOTO.hotel },
        { id: 'h-monti', kind: 'Hotel · 1 night', title: 'Palazzo Monti Suites', facts: ['4.6', '€139 / night', '8 min from Hotel Roma Centro'], why: 'Quiet side street in Monti, close to Metro B for an easy last morning.', cta: 'View & book', photo: PHOTO.hotel },
      ],
    },
    {
      id: 'free', title: 'Fill your free time', badge: { label: 'Day 2 · Fri 13 Nov · 13:00–16:00 free', tone: 'info' },
      items: [
        { id: 'f-enzo', kind: 'Lunch · €€', title: 'Trattoria da Enzo', facts: ['Lunch · €€', '12 min walk'], why: "Locals' favourite for carbonara, fits your budget.", cta: 'Add to Day 2', photo: PHOTO.trattoria },
        { id: 'f-capitoline', kind: 'Museum', title: 'Capitoline Museums', facts: ['1.5 h', '8 min walk'], why: 'Next to the Forum you visit in the morning, with great views from the terrace.', cta: 'Add to Day 2', photo: PHOTO.capitoline },
        { id: 'f-coffee', kind: 'Coffee · €', title: "Sant'Eustachio Il Caffè", facts: ['Coffee · €', '10 min walk'], why: 'You like coffee stops: this one has roasted its own beans since 1938.', cta: 'Add to Day 2', photo: PHOTO.coffee },
      ],
    },
    {
      id: 'miss', title: "Don't miss in Rome", badge: { label: 'Top picks for your style', tone: 'info' },
      items: [
        { id: 'm-vatican', kind: 'Museum', title: 'Vatican Museums', facts: ['3 h', 'Metro A · 25 min'], why: 'Already booked for Sat 14 Nov — add the Sistine Chapel audio guide.', cta: 'Add to plan', tags: [{ label: 'Book ahead · often sold out', tone: 'warn' }, { label: '🎧 Audio guide', tone: 'info' }], photo: PHOTO.vatican },
        { id: 'm-pantheon', kind: 'Landmark', title: 'Pantheon', facts: ['45 min', '15 min walk'], why: 'Pair it with your coffee stop. It is a 2-minute walk away.', cta: 'Add to plan', tags: [{ label: '🎧 Audio guide', tone: 'info' }], photo: PHOTO.pantheon },
        { id: 'm-trastevere', kind: 'Walk · evening', title: 'Trastevere evening walk', facts: ['2 h', '20 min walk'], why: 'Lively lanes and dinner spots, an easy end to Day 3.', cta: 'Add to plan', photo: PHOTO.trastevere },
      ],
    },
  ],
  prague: [
    {
      id: 'miss', title: "Don't miss in Prague", badge: { label: 'Christmas markets are on', tone: 'info' },
      items: [
        { id: 'p-market', kind: 'Market · evening', title: 'Old Town Christmas market', facts: ['1–2 h', '5 min from Hotel Josef'], why: 'Open every day until 6 January, best after dark.', cta: 'Add to plan', photo: PHOTO.prague },
        { id: 'p-bridge', kind: 'Landmark', title: 'Charles Bridge at sunrise', facts: ['45 min', '12 min walk'], why: 'You have a free morning on 26 Dec — almost no crowds before 8:00.', cta: 'Add to plan', tags: [{ label: '🎧 Audio guide', tone: 'info' }], photo: PHOTO.prague },
        { id: 'p-cafe', kind: 'Coffee · €', title: 'Café Louvre', facts: ['Coffee · €', '15 min walk'], why: 'Historic café from 1902, a classic coffee stop.', cta: 'Add to plan', photo: PHOTO.coffee },
      ],
    },
  ],
  amsterdam: [
    {
      id: 'fix', title: 'Fix your trip', badge: { label: 'No transport yet', tone: 'warn' },
      items: [
        { id: 'a-train', kind: 'Train', title: 'NS Intercity Rotterdam → Amsterdam', facts: ['40 min', 'Every 10 min'], why: 'No need to book ahead — check in with your bank card.', cta: 'Add to plan', photo: PHOTO.amsterdam },
        { id: 'a-canal', kind: 'Tour', title: 'Evening canal cruise', facts: ['1 h', '6 min walk'], why: 'Leaves near your hotel, nice for a first evening.', cta: 'Add to plan', photo: PHOTO.amsterdam },
        { id: 'a-rijks', kind: 'Museum', title: 'Rijksmuseum', facts: ['2.5 h', 'Tram 2 · 15 min'], why: 'Timed tickets — Saturday mornings sell out first.', cta: 'Add to plan', tags: [{ label: 'Book ahead', tone: 'warn' }], photo: PHOTO.amsterdam },
      ],
    },
  ],
}
