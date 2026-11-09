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
      { id: 'forum', name: 'Roman Forum', note: 'Included in combined ticket', walk: '3 min' },
      { id: 'arch', name: 'Arch of Constantine', note: 'Monument · 1 min audio', walk: '1 min' },
      { id: 'clemente', name: 'Basilica of San Clemente', note: 'Church · open until 18:00', walk: '9 min' },
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
  {
    id: 'forum', tripId: 'rome', name: 'Roman Forum', kind: 'Ancient site', address: 'Via della Salara Vecchia 5/6, 00186 Roma',
    photo: wiki('d/de/Roman_Forum_from_Palatine_Hill.jpg', 1920), dayIso: '2026-11-13', bookingId: 'rome-colosseum',
    hours: { today: '08:30–16:30', note: 'Same combined ticket as the Colosseum' },
    fromHotel: '18 min walk', chapter: 'Heart of ancient Rome · 1 of 1', seconds: 60,
    narration: {
      en: "For almost a thousand years this valley was the centre of Roman life. Elections, trials, speeches and markets all happened here. Look for the eight granite columns of the Temple of Saturn, which once held the state treasury. Nearby is the spot where Julius Caesar's body was burned in 44 BC; people still leave flowers there today. Walk along the Via Sacra, the sacred road that victory parades followed towards the Capitoline Hill. Your Colosseum ticket also covers the Forum and the Palatine Hill above it.",
      tr: "Neredeyse bin yıl boyunca bu vadi Roma yaşamının merkeziydi. Seçimler, davalar, konuşmalar ve pazarlar hep burada yapılırdı. Bir zamanlar devlet hazinesini barındıran Satürn Tapınağı'nın sekiz granit sütununu arayın. Yakınında, Jül Sezar'ın cesedinin MÖ 44'te yakıldığı yer var; insanlar bugün hâlâ oraya çiçek bırakıyor. Zafer alaylarının Capitolinus Tepesi'ne doğru izlediği kutsal yol Via Sacra boyunca yürüyün. Kolezyum biletiniz Forum'u ve üstündeki Palatinus Tepesi'ni de kapsıyor.",
    },
    nearby: [
      { id: 'colosseum', name: 'Colosseum', note: 'Ancient site · 2 min audio', walk: '3 min' },
      { id: 'arch', name: 'Arch of Constantine', note: 'Monument · 1 min audio', walk: '4 min' },
      { name: 'Capitoline Museums', note: 'Museum · 1.5 h', walk: '6 min' },
    ],
  },
  {
    id: 'arch', tripId: 'rome', name: 'Arch of Constantine', kind: 'Monument', address: 'Via di San Gregorio, 00186 Roma',
    photo: wiki('d/d5/Arch_of_Constantine_%28Rome%29_-_South_side%2C_from_Via_triumphalis.jpg', 1920), dayIso: '2026-11-13',
    hours: { today: 'Open 24 hours', note: 'Seen from outside · free' },
    fromHotel: '23 min walk', chapter: 'The triumphal arch · 1 of 1', seconds: 45,
    narration: {
      en: "This is the largest surviving triumphal arch in Rome, finished in AD 315 to celebrate Constantine's victory at the Milvian Bridge. Look closely and you will notice the styles don't match. Many of the reliefs were taken from older monuments built for Trajan, Hadrian and Marcus Aurelius, and their faces were recut to look like Constantine. It is one of the earliest examples of recycling in Roman architecture.",
      tr: "Burası Roma'da ayakta kalan en büyük zafer takı; Konstantin'in Milvius Köprüsü'ndeki zaferini kutlamak için MS 315'te tamamlandı. Yakından bakarsanız üslupların birbirini tutmadığını fark edersiniz. Kabartmaların çoğu Traianus, Hadrianus ve Marcus Aurelius için yapılmış daha eski anıtlardan alındı ve yüzleri Konstantin'e benzeyecek şekilde yeniden oyuldu. Roma mimarisinde geri dönüşümün en eski örneklerinden biridir.",
    },
    nearby: [
      { id: 'colosseum', name: 'Colosseum', note: 'Ancient site · 2 min audio', walk: '1 min' },
      { id: 'forum', name: 'Roman Forum', note: 'Ancient site · 1 min audio', walk: '4 min' },
      { id: 'clemente', name: 'Basilica of San Clemente', note: 'Church · open until 18:00', walk: '8 min' },
    ],
  },
  {
    id: 'clemente', tripId: 'rome', name: 'Basilica of San Clemente', kind: 'Church', address: 'Via Labicana 95, 00184 Roma',
    photo: wiki('3/3c/San_Clemente_al_Laterano_-_Interior.jpg', 1920), dayIso: '2026-11-13',
    hours: { today: '09:00–12:30, 15:00–18:00', note: 'Underground levels · €10' },
    fromHotel: '20 min walk', chapter: 'Three churches in one · 1 of 1', seconds: 50,
    narration: {
      en: "San Clemente is three buildings stacked on top of each other. The church you enter was built in the twelfth century. Go down the stairs and you reach a fourth-century basilica with faded frescoes. Go down once more and you are in first-century Rome: a house and a temple to the god Mithras. At the bottom, listen carefully and you can hear an underground stream still running beneath the city.",
      tr: "San Clemente üst üste yığılmış üç yapıdan oluşur. Girdiğiniz kilise on ikinci yüzyılda inşa edildi. Merdivenlerden inince solmuş fresklerle dolu dördüncü yüzyıldan kalma bir bazilikaya ulaşırsınız. Bir kat daha inince birinci yüzyıl Roma'sındasınız: bir ev ve tanrı Mithras'a adanmış bir tapınak. En altta dikkatle dinlerseniz şehrin altında hâlâ akan bir yeraltı deresini duyabilirsiniz.",
    },
    nearby: [
      { id: 'colosseum', name: 'Colosseum', note: 'Ancient site · 2 min audio', walk: '9 min' },
      { id: 'arch', name: 'Arch of Constantine', note: 'Monument · 1 min audio', walk: '8 min' },
      { name: 'Ai Tre Scalini', note: 'Wine bar · €€', walk: '12 min' },
    ],
  },
]

export const placeById = (id: string) => places.find((p) => p.id === id)

/** Which place page a day-plan item opens. */
export const placeIdFor = (title: string) => places.find((p) => title.includes(p.name.split(' ')[0]))?.id
