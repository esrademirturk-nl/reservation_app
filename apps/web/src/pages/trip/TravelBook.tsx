import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Sparkles } from 'lucide-react'
import type { Trip } from '../../data/types'
import { fmtDay, fmtWeekday, tripDays } from '../../lib/trips'
import { Card, Photo } from '../../components/ui'
import { bookPhotos, Cover, SpreadView, type Spread, type Theme } from './BookPages'

const themes: { id: Theme; name: string; note: string }[] = [
  { id: 'editorial', name: 'Editorial', note: 'Serif · warm tones' },
  { id: 'bold', name: 'Bold', note: 'Heavy type · vivid' },
  { id: 'minimal', name: 'Minimal', note: 'Monochrome · quiet' },
]

const pages: { id: Spread; label: string }[] = [
  { id: 'cover', label: 'Cover' },
  { id: 'route', label: 'Route map' },
  { id: 'chapter', label: 'Day 2' },
  { id: 'photos', label: 'Day 2 · Photos' },
  { id: 'stats', label: 'Stats' },
  { id: 'back', label: 'Back cover' },
]

export function TravelBook({ trip }: { trip: Trip }) {
  const [theme, setTheme] = useState<Theme>('editorial')
  const [spread, setSpread] = useState<Spread>('chapter')
  const photoCounts = [9, 14, 12, 7]
  const thumbs = [trip.photo, bookPhotos.forum, bookPhotos.pasta, bookPhotos.trevi]

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-ink">Your {trip.city} travel book</h2>
          <p className="text-sm text-muted"><span className="mr-1 rounded-md bg-tint px-1.5 py-0.5 text-xs font-bold text-primary">Draft</span> 42 photos · 24 pages</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-muted">Theme</span>
          <div className="flex rounded-xl border border-line bg-surface p-1">
            {themes.map((t) => (
              <button key={t.id} onClick={() => setTheme(t.id)} className={`rounded-lg px-3 py-1.5 text-sm font-bold ${theme === t.id ? 'bg-tint text-ink' : 'text-muted'}`}>{t.name}</button>
            ))}
          </div>
          <button className="rounded-xl border border-line px-4 py-2.5 text-sm font-bold text-ink hover:bg-tint">Preview</button>
          <Link to={`/trips/${trip.id}/book/order?theme=${theme}`} className="rounded-xl bg-highlight px-5 py-2.5 text-sm font-bold text-white hover:brightness-110">Order printed book</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            {themes.map((t) => (
              <button key={t.id} onClick={() => setTheme(t.id)} className={`flex items-center gap-3 rounded-2xl border-2 bg-surface p-2.5 text-left ${theme === t.id ? 'border-highlight' : 'border-line hover:border-muted'}`}>
                <div className="w-14 flex-none overflow-hidden rounded text-[3px] shadow"><Cover trip={trip} theme={t.id} /></div>
                <span>
                  <span className="block text-sm font-bold text-ink">{t.name}</span>
                  <span className="block text-xs text-muted">{t.note}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="rounded-2xl bg-[#ece7df] p-4 text-[8px] sm:p-10 sm:text-[13px] dark:bg-[#0b1c36]">
            <SpreadView trip={trip} theme={theme} spread={spread} />
          </div>

          <div className="flex gap-3 overflow-x-auto pb-1">
            {pages.map((p) => (
              <button key={p.id} onClick={() => setSpread(p.id)} className="flex flex-col items-center gap-1.5">
                <span className={`block w-24 overflow-hidden rounded-md border-2 text-[3px] ${spread === p.id ? 'border-highlight' : 'border-transparent'}`}>
                  <SpreadView trip={trip} theme={theme} spread={p.id} />
                </span>
                <span className={`text-xs font-semibold ${spread === p.id ? 'text-ink' : 'text-muted'}`}>{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        <Card className="flex flex-col gap-4 p-5 lg:sticky lg:top-[100px]">
          <div>
            <h3 className="font-bold text-ink">Photos</h3>
            <p className="text-xs text-muted">42 photos · auto-sorted by day</p>
          </div>
          {tripDays(trip).slice(0, 4).map((d, i) => (
            <div key={d}>
              <p className="mb-1.5 flex justify-between text-xs font-bold text-ink">Day {i + 1} · {fmtWeekday(d)} {fmtDay(d)} <span className="text-muted">{photoCounts[i]}</span></p>
              <div className="grid grid-cols-4 gap-1.5">
                {thumbs.map((src, j) => (
                  <div key={j} className="relative">
                    <Photo src={src} alt="" className="aspect-square rounded-md" />
                    {j === 3 && <span className="absolute inset-0 grid place-items-center rounded-md bg-primary/70 text-xs font-bold text-white">+{photoCounts[i] - 3}</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
          <button className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-link/60 py-2.5 text-sm font-bold text-link hover:bg-tint/50"><Plus size={15} /> Add photos</button>
          <p className="flex gap-2 rounded-xl bg-tint/60 p-3 text-xs text-muted"><Sparkles size={14} className="flex-none text-accent-decor" /> Photos were matched to your day plan using time and location.</p>
        </Card>
      </div>
    </div>
  )
}
