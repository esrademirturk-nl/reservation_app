import type { Trip } from '../../data/types'
import { Photo } from '../../components/ui'

export type Theme = 'editorial' | 'bold' | 'minimal'
export type Spread = 'cover' | 'route' | 'chapter' | 'photos' | 'stats' | 'back'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const dates = (t: Trip) => `${Number(t.start.slice(8))}—${Number(t.end.slice(8))} ${MONTHS[Number(t.end.slice(5, 7)) - 1]} ${t.end.slice(0, 4)}`

const wiki = (path: string) => `https://upload.wikimedia.org/wikipedia/commons/thumb/${path}/960px-${path.split('/').pop()}`
export const bookPhotos = {
  forum: wiki('d/de/Roman_Forum_from_Palatine_Hill.jpg'),
  pasta: wiki('6/6a/Spaghetti_alla_Carbonara.jpg'),
  trevi: wiki('7/7e/Trevi_Fountain%2C_Rome%2C_Italy_2_-_May_2007.jpg'),
}

/** A single page; the book is shown as spreads of two pages (cover/back are single). */
const Page = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`relative aspect-[3/4] w-full overflow-hidden ${className}`}>{children}</div>
)

export function Cover({ trip, theme }: { trip: Trip; theme: Theme }) {
  if (theme === 'bold')
    return (
      <Page className="bg-[#d5603f] p-[8%]">
        <span className="rounded-full bg-[#043263] px-3 py-1 text-[0.6em] font-extrabold tracking-widest text-white">TRAVEL BOOK · {trip.start.slice(0, 4)}</span>
        <Photo src={trip.photo} alt="" className="!absolute right-[-10%] top-[8%] size-[55%] rounded-full" />
        <p className="absolute bottom-[22%] left-[7%] text-[4.2em] font-extrabold leading-none tracking-tight text-[#043263]">{trip.city.toUpperCase()}</p>
        <p className="absolute bottom-[10%] left-[8%] text-[0.85em] font-extrabold text-[#043263]">{dates(trip).replace(/ \d{4}$/, '')} · Esra & Kani</p>
      </Page>
    )
  if (theme === 'minimal')
    return (
      <Page className="flex flex-col items-center justify-center gap-[6%] bg-white">
        <Photo src={trip.photo} alt="" className="h-[30%] w-[50%] grayscale" />
        <p className="text-[1.1em] font-light tracking-[0.5em] text-[#111]">{trip.city.toUpperCase()}</p>
        <p className="text-[0.55em] tracking-[0.35em] text-[#777]">{dates(trip).toUpperCase()}</p>
      </Page>
    )
  return (
    <Page className="bg-[#2a2622]">
      <Photo src={trip.photo} alt="" className="!absolute inset-0 opacity-90" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
      <p className="absolute right-[8%] top-[12%] font-serif text-[4em] font-light leading-none text-white">{trip.city}</p>
      <p className="absolute right-[8%] top-[28%] text-[0.55em] font-semibold tracking-[0.3em] text-white/90">{dates(trip).toUpperCase()} · ESRA & KANI</p>
      <p className="absolute bottom-[6%] left-[8%] text-[0.5em] tracking-[0.35em] text-white/80">A WAYPAD TRAVEL BOOK</p>
    </Page>
  )
}

export function BackCover({ trip }: { trip: Trip }) {
  return (
    <Page className="flex flex-col items-center justify-center gap-[8%] bg-[#f4efe6] text-[#3b2f25]">
      <svg viewBox="0 0 200 120" className="w-[70%]">
        <path d="M30 20 C 80 30, 90 70, 160 95" fill="none" stroke="#b5482c" strokeWidth="1.2" strokeDasharray="3 3" />
        <circle cx="30" cy="20" r="3" fill="#3b2f25" />
        <circle cx="160" cy="95" r="4" fill="#b5482c" />
        <text x="30" y="12" fontSize="8" textAnchor="middle" fill="#3b2f25">Amsterdam</text>
        <text x="160" y="112" fontSize="8" textAnchor="middle" fill="#3b2f25">{trip.city}</text>
      </svg>
      <p className="text-[0.7em] tracking-widest">4 DAYS · 3 MUSEUMS · 23 KM WALKED</p>
      <img src={`${import.meta.env.BASE_URL}waypad-logo-light.png`} alt="Waypad" className="h-[4%] opacity-70" />
    </Page>
  )
}

export function SpreadView({ trip, theme, spread }: { trip: Trip; theme: Theme; spread: Spread }) {
  const paper = theme === 'minimal' ? 'bg-white text-[#111]' : theme === 'bold' ? 'bg-[#fff7f2] text-[#043263]' : 'bg-[#f4efe6] text-[#3b2f25]'
  const accent = theme === 'bold' ? 'text-[#d5603f]' : theme === 'minimal' ? 'text-[#111]' : 'text-[#b5482c]'
  const serif = theme === 'bold' ? 'font-sans font-extrabold' : 'font-serif'

  if (spread === 'cover') return <div className="mx-auto w-1/2"><Cover trip={trip} theme={theme} /></div>
  if (spread === 'back') return <div className="mx-auto w-1/2"><BackCover trip={trip} /></div>

  const fold = <div className="pointer-events-none absolute inset-y-0 left-1/2 w-10 -translate-x-1/2 bg-gradient-to-r from-transparent via-black/10 to-transparent" />

  return (
    <div className="relative grid grid-cols-2 shadow-card">
      {spread === 'chapter' && (
        <>
          <Page className={`${paper} p-[12%]`}>
            <p className="text-[0.55em] tracking-[0.35em] opacity-70">CHAPTER TWO</p>
            <p className={`mt-[25%] ${serif} text-[6em] font-light leading-none ${accent}`}>02</p>
            <p className={`mt-[6%] ${serif} text-[1.8em]`}>The Eternal City</p>
            <p className="mt-[4%] text-[0.65em] leading-relaxed opacity-75">Friday, 13 November — the Colosseum at opening time, lunch in Monti, Trevi after dark.</p>
            <p className="absolute bottom-[5%] left-[12%] text-[0.5em] opacity-60">14</p>
          </Page>
          <Page className="bg-[#2a2622]"><Photo src={trip.photo} alt="" className="!absolute inset-0" /></Page>
        </>
      )}
      {spread === 'photos' && (
        <>
          <Page className={paper}>
            <Photo src={bookPhotos.forum} alt="" className={`!absolute left-[8%] top-[8%] h-[62%] w-[84%] ${theme === 'minimal' ? 'grayscale' : ''}`} />
            <p className={`absolute bottom-[10%] left-[8%] right-[8%] ${serif} text-[1.1em] italic`}>Morning light over the Forum, before the city woke up.</p>
          </Page>
          <Page className={paper}>
            <Photo src={bookPhotos.pasta} alt="" className={`!absolute right-[8%] top-[8%] h-[30%] w-[48%] ${theme === 'minimal' ? 'grayscale' : ''}`} />
            <Photo src={bookPhotos.trevi} alt="" className={`!absolute right-[8%] top-[42%] h-[26%] w-[48%] ${theme === 'minimal' ? 'grayscale' : ''}`} />
            <svg viewBox="0 0 100 40" className="absolute bottom-[14%] left-[8%] w-[38%]">
              <path d="M5 30 Q 30 5, 50 18 T 95 25" fill="none" stroke="currentColor" strokeWidth=".8" />
              {[[5, 30, 'Colosseo'], [50, 18, 'Monti'], [95, 25, 'Trevi']].map(([x, y, l]) => (
                <g key={String(l)}><circle cx={Number(x)} cy={Number(y)} r="1.6" fill="currentColor" /><text x={Number(x)} y={Number(y) + 8} fontSize="4.5" textAnchor="middle" fill="currentColor">{String(l)}</text></g>
              ))}
            </svg>
            <div className="absolute bottom-[12%] right-[8%] flex border border-current px-[3%] py-[2%] text-[0.5em]">
              <div><p className="tracking-widest opacity-70">ADMIT TWO</p><p className={`${serif} text-[1.6em]`}>Colosseum</p><p>13.11.2026</p></div>
            </div>
            <p className="absolute bottom-[5%] right-[8%] text-[0.5em] opacity-60">15</p>
          </Page>
        </>
      )}
      {spread === 'route' && (
        <>
          <Page className={`${paper} p-[12%]`}>
            <p className="text-[0.55em] tracking-[0.35em] opacity-70">THE ROUTE</p>
            <p className={`mt-[20%] ${serif} text-[2.4em] leading-tight`}>Amsterdam to {trip.city}</p>
            <p className="mt-[5%] text-[0.65em] opacity-75">1,300 km · 2 h 15 min by air · 4 nights</p>
          </Page>
          <Page className={paper}>
            <svg viewBox="0 0 100 130" className="absolute inset-[10%]">
              <path d="M30 15 C 60 40, 40 80, 70 115" fill="none" stroke="currentColor" strokeWidth=".7" strokeDasharray="2 2" />
              <circle cx="30" cy="15" r="2" fill="currentColor" /><text x="34" y="17" fontSize="5" fill="currentColor">Amsterdam</text>
              <circle cx="70" cy="115" r="2.6" className={accent} fill="currentColor" /><text x="60" y="125" fontSize="5" fill="currentColor">{trip.city}</text>
            </svg>
          </Page>
        </>
      )}
      {spread === 'stats' && (
        <>
          <Page className={`${paper} p-[12%]`}>
            <p className="text-[0.55em] tracking-[0.35em] opacity-70">IN NUMBERS</p>
            {[['4', 'days'], ['3', 'museums'], ['23', 'km walked'], ['42', 'photos']].map(([n, l], i) => (
              <p key={l} className={`${i ? 'mt-[6%]' : 'mt-[18%]'} ${serif} text-[2.6em] leading-none`}>{n} <span className="text-[0.35em] tracking-widest opacity-70">{l.toUpperCase()}</span></p>
            ))}
          </Page>
          <Page className="bg-[#2a2622]"><Photo src={bookPhotos.trevi} alt="" className="!absolute inset-0" /></Page>
        </>
      )}
      {fold}
    </div>
  )
}
