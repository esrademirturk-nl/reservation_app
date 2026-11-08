import colosseum from './colosseum-guide.json'

export type Lang = 'en' | 'tr' | 'nl'
export const LANGS: { code: Lang; label: string; voice: string }[] = [
  { code: 'en', label: 'English', voice: 'en-GB' },
  { code: 'tr', label: 'Türkçe', voice: 'tr-TR' },
  { code: 'nl', label: 'Nederlands', voice: 'nl-NL' },
]

export interface Place {
  id: string
  tripId: string
  name: string
  kind: string
  address: string
  photo: string
  dayIso: string
  /** booking that gives access, if any */
  bookingId?: string
  hours: { today: string; note: string }
  fromHotel: string
  chapter: string
  /** narration per language; missing languages fall back to English */
  narration: Partial<Record<Lang, string>> & { en: string }
  seconds: number
  nearby: { id?: string; name: string; note: string; walk: string }[]
}

const wiki = (path: string, w = 1280) => `https://upload.wikimedia.org/wikipedia/commons/thumb/${path}/${w}px-${path.split('/').pop()}`

export const places: Place[] = [
  {
    id: 'colosseum', tripId: 'rome', name: 'Colosseum', kind: 'Ancient site', address: 'Piazza del Colosseo, 00184 Roma',
    photo: wiki('b/ba/Colosseum%2C_Rome%2C_Italy.jpg', 1920), dayIso: '2026-11-13', bookingId: 'rome-colosseum',
    hours: { today: '08:30–16:30', note: 'Last entry 15:30 · Nov–Feb hours' },
    fromHotel: '22 min walk · Metro B, 2 stops', chapter: 'Story & architecture · 1 of 3',
    narration: colosseum as Record<Lang, string> & { en: string }, seconds: 105,
    nearby: [
      { name: 'Roman Forum', note: 'Included in combined ticket', walk: '3 min' },
      { name: 'Arch of Constantine', note: 'Monument · 2 min audio', walk: '1 min' },
      { name: 'Basilica of San Clemente', note: 'Church · open until 18:00', walk: '9 min' },
    ],
  },
  {
    id: 'trevi', tripId: 'rome', name: 'Trevi Fountain', kind: 'Fountain', address: 'Piazza di Trevi, 00187 Roma',
    photo: wiki('7/7e/Trevi_Fountain%2C_Rome%2C_Italy_2_-_May_2007.jpg', 1920), dayIso: '2026-11-13',
    hours: { today: 'Open 24 hours', note: 'Quietest before 8:00 or after 22:00' },
    fromHotel: '12 min walk', chapter: 'The fountain · 1 of 1', seconds: 70,
    narration: {
      en: "This is the Trevi Fountain, finished in 1762 after thirty years of work. It sits at the end of the Aqua Virgo, an aqueduct that has carried water into Rome since 19 BC. In the centre stands Oceanus on a shell-shaped chariot, pulled by two sea horses: one calm, one wild, to show the two moods of the sea. The fountain is built against the back of a palace, so the building itself becomes the stage. Tradition says that if you throw a coin over your left shoulder with your right hand, you will return to Rome. Around a million euros are collected every year and given to charity.",
      tr: "Burası 1762'de, otuz yıllık çalışmanın ardından tamamlanan Trevi Çeşmesi. MÖ 19'dan beri Roma'ya su taşıyan Aqua Virgo su kemerinin son noktasında yer alır. Ortada, deniz kabuğu biçimli bir arabanın üzerinde Okeanos durur; arabayı biri sakin, biri vahşi iki deniz atı çeker ve denizin iki ruh halini anlatır. Çeşme bir sarayın arka cephesine yaslanarak yapılmıştır, bu yüzden bina sahnenin kendisi olur. Geleneğe göre sağ elinizle sol omzunuzun üzerinden bir bozuk para atarsanız Roma'ya geri dönersiniz. Her yıl toplanan yaklaşık bir milyon euro hayır kurumlarına bağışlanır.",
    },
    nearby: [
      { id: 'pantheon', name: 'Pantheon', note: 'Temple · 2 min audio', walk: '8 min' },
      { name: 'Spanish Steps', note: 'Landmark', walk: '10 min' },
      { name: 'Il Gelato di San Crispino', note: 'Gelato · €', walk: '1 min' },
    ],
  },
  {
    id: 'pantheon', tripId: 'rome', name: 'Pantheon', kind: 'Temple · Church', address: 'Piazza della Rotonda, 00186 Roma',
    photo: wiki('a/a3/Pantheon_Rome_-_Front.jpg', 1920), dayIso: '2026-11-14',
    hours: { today: '09:00–19:00', note: 'Timed entry · €5' },
    fromHotel: '18 min walk', chapter: 'The dome · 1 of 1', seconds: 65,
    narration: {
      en: "The Pantheon you see today was built under Emperor Hadrian around AD 125, yet the inscription still credits Marcus Agrippa, who built the first temple here. Step inside and look up. The dome is still the largest unreinforced concrete dome in the world, forty-three metres across, exactly as high as it is wide. The concrete gets lighter as it rises, mixed with pumice near the top. The only light comes from the oculus, a nine-metre opening to the sky. When it rains, the water falls straight in and drains through small holes in the marble floor. The painter Raphael is buried here, on the left as you face the altar.",
      tr: "Bugün gördüğünüz Pantheon MS 125 civarında İmparator Hadrianus döneminde inşa edildi; yine de yazıt, buradaki ilk tapınağı yaptıran Marcus Agrippa'yı anar. İçeri girin ve yukarı bakın. Kubbe hâlâ dünyanın en büyük donatısız beton kubbesidir: kırk üç metre çapında ve tam genişliği kadar yüksek. Beton yükseldikçe hafifler, tepeye yakın kısımlarda ponza taşıyla karıştırılmıştır. Tek ışık, gökyüzüne açılan dokuz metrelik oculustan gelir. Yağmur yağdığında su doğrudan içeri düşer ve mermer zemindeki küçük deliklerden akar. Ressam Raffaello da burada, sunağa bakarken solda gömülüdür.",
    },
    nearby: [
      { id: 'trevi', name: 'Trevi Fountain', note: 'Fountain · 1 min audio', walk: '8 min' },
      { name: "Sant'Eustachio Il Caffè", note: 'Coffee · €', walk: '2 min' },
      { name: 'Piazza Navona', note: 'Square', walk: '5 min' },
    ],
  },
]

export const placeById = (id: string) => places.find((p) => p.id === id)

/** Which place page a day-plan item opens. */
export const placeIdFor = (title: string) => places.find((p) => title.includes(p.name.split(' ')[0]))?.id
