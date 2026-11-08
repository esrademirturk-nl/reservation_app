import { Link, useLocation } from 'react-router-dom'
import { Headphones, Pause, Play, X } from 'lucide-react'
import { fmtClock, useAudio } from '../lib/audio'
import { Photo } from './ui'

/** Keeps the audio guide playing while you browse other pages. */
export function MiniPlayer() {
  const a = useAudio()
  const { pathname } = useLocation()
  if (!a.place || pathname.endsWith(`/places/${a.place.id}`) || (!a.playing && a.elapsed === 0)) return null
  const pct = (a.elapsed / a.total) * 100

  return (
    <div className="fixed bottom-6 right-8 z-40 w-[400px] overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      <div className="flex items-center gap-3 p-3">
        <Photo src={a.place.photo} alt="" className="size-12 flex-none rounded-xl" />
        <Link to={`/places/${a.place.id}`} className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-xs font-bold text-accent"><Headphones size={12} /> Audio guide</span>
          <span className="block truncate font-bold text-ink">{a.place.name}</span>
          <span className="block truncate text-xs text-muted">{a.sentences[a.cur]}</span>
        </Link>
        <span className="text-xs font-semibold text-muted">{fmtClock(a.elapsed)}</span>
        <button aria-label={a.playing ? 'Pause' : 'Play'} onClick={a.toggle} className="grid size-10 place-items-center rounded-full bg-highlight text-white">
          {a.playing ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" className="ml-0.5" />}
        </button>
        <button aria-label="Close audio guide" onClick={a.close} className="text-muted hover:text-ink"><X size={18} /></button>
      </div>
      <div className="h-1 bg-tint"><div className="h-full bg-link" style={{ width: `${pct}%` }} /></div>
    </div>
  )
}
