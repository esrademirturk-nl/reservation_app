import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Check, ChevronDown, Headphones, Pause, Play, Plus, RotateCcw, RotateCw, Sparkles } from 'lucide-react'
import { LANGS, placeById } from '../data/places'
import { bookingById, fmtDay, fmtTime, fmtWeekday, tripById } from '../lib/trips'
import { fmtClock, useAudio } from '../lib/audio'
import { Card, Photo } from '../components/ui'

export function PlaceDetail() {
  const { placeId = '' } = useParams()
  const place = placeById(placeId)
  const audio = useAudio()
  const [langOpen, setLangOpen] = useState(false)
  const [showT, setShowT] = useState(true)

  useEffect(() => {
    if (place) audio.load(place.id)
  }, [place?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!place) return <p className="text-muted">Place not found.</p>
  const trip = tripById(place.tripId)!
  const ticket = place.bookingId ? bookingById(place.bookingId) : undefined
  const a = audio.place?.id === place.id ? audio : null
  const pct = a ? (a.elapsed / a.total) * 100 : 0
  const langLabel = LANGS.find((l) => l.code === audio.lang)!.label

  return (
    <div className="mx-auto flex max-w-[1120px] flex-col gap-6">
      <nav className="flex items-center gap-2 text-sm">
        <Link to={`/trips/${trip.id}`} className="font-semibold text-link">{trip.city}, {trip.country}</Link>
        <span className="text-muted">/</span>
        <Link to={`/trips/${trip.id}/plan?day=${Number(place.dayIso.slice(8)) - Number(trip.start.slice(8)) + 1}`} className="font-semibold text-link">{fmtWeekday(place.dayIso)} {fmtDay(place.dayIso)}</Link>
        <span className="text-muted">/</span>
        <span className="text-muted">{place.name}</span>
      </nav>

      <div className="grid grid-cols-[minmax(0,1fr)_360px] items-start gap-6">
        <div className="flex flex-col gap-6">
          <section className="relative overflow-hidden rounded-2xl border border-line bg-surface">
            <Photo src={place.photo} alt={place.name} className="h-[300px]" />
            <div className="flex items-end justify-between gap-4 p-7">
              <div>
                <p className="text-sm font-bold text-accent">{place.kind} · {trip.city}</p>
                <h1 className="text-[40px] font-extrabold leading-tight tracking-tight text-ink">{place.name}</h1>
                <p className="text-[15px] text-muted">{place.address}</p>
              </div>
              {ticket && (
                <Link to={`/trips/${trip.id}/bookings?ticket=${ticket.id}`} className="rounded-xl bg-tint px-5 py-3 text-sm text-ink hover:brightness-95">
                  <span className="block text-xs font-semibold text-muted">Your ticket</span>
                  <span className="font-bold">{fmtDay(ticket.start)}, {fmtTime(ticket.start)} entry</span>
                </Link>
              )}
            </div>
          </section>

          <Card className="flex flex-col gap-5 p-7">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-xl bg-tint text-primary"><Headphones size={20} /></span>
              <div className="flex-1">
                <h2 className="text-lg font-extrabold text-ink">Audio guide</h2>
                <p className="text-sm text-muted">{place.chapter}</p>
              </div>
              <span className="flex items-center gap-1.5 rounded-full bg-tint px-3 py-1 text-xs font-bold text-primary"><Sparkles size={13} /> AI-generated narration</span>
              <div className="relative">
                <button onClick={() => setLangOpen(!langOpen)} className="flex items-center gap-2 rounded-xl border border-line px-4 py-2 text-sm font-bold text-ink hover:bg-tint">
                  {langLabel} <ChevronDown size={15} />
                </button>
                {langOpen && (
                  <div className="absolute right-0 top-12 z-20 w-44 rounded-xl border border-line bg-surface p-1 shadow-card">
                    {LANGS.filter((l) => place.narration[l.code]).map((l) => (
                      <button key={l.code} onClick={() => { audio.setLang(l.code); setLangOpen(false) }} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-semibold text-ink hover:bg-tint">
                        {l.label} {l.code === audio.lang && <Check size={15} className="text-link" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button aria-label="Back 10 seconds" onClick={() => a && audio.seek(Math.max(0, a.elapsed - 10))} className="grid size-11 place-items-center rounded-full border border-line text-ink hover:bg-tint"><RotateCcw size={18} /></button>
              <button aria-label={a?.playing ? 'Pause' : 'Play'} onClick={audio.toggle} className="grid size-16 place-items-center rounded-full bg-highlight text-white shadow-pop hover:brightness-110">
                {a?.playing ? <Pause size={26} fill="currentColor" /> : <Play size={26} fill="currentColor" className="ml-1" />}
              </button>
              <button aria-label="Forward 10 seconds" onClick={() => a && audio.seek(Math.min(a.total - 1, a.elapsed + 10))} className="grid size-11 place-items-center rounded-full border border-line text-ink hover:bg-tint"><RotateCw size={18} /></button>
              <div className="flex flex-1 flex-col gap-1.5">
                <div
                  className="relative h-2 cursor-pointer rounded-full bg-tint"
                  onClick={(e) => {
                    const r = e.currentTarget.getBoundingClientRect()
                    audio.seek(((e.clientX - r.left) / r.width) * place.seconds)
                  }}
                >
                  <div className="h-full rounded-full bg-link" style={{ width: `${pct}%` }} />
                  <span className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary" style={{ left: `${pct}%` }} />
                </div>
                <div className="flex justify-between text-xs font-semibold text-muted">
                  <span>{fmtClock(a?.elapsed ?? 0)}</span>
                  <span>{audio.status}</span>
                  <span>{fmtClock(place.seconds)}</span>
                </div>
              </div>
              <button onClick={audio.cycleSpeed} className="rounded-xl border border-line px-3 py-2 text-sm font-bold text-ink hover:bg-tint">{audio.speed}×</button>
            </div>

            <div className="border-t border-line pt-4">
              <button onClick={() => setShowT(!showT)} className="text-sm font-bold text-link">{showT ? 'Hide transcript' : 'Show transcript'}</button>
              {showT && (
                <p className="mt-3 text-[17px] leading-relaxed">
                  {audio.sentences.map((s, i) => {
                    const on = a && i === a.cur && (a.playing || a.elapsed > 0)
                    return (
                      <span
                        key={i}
                        onClick={() => audio.playFrom(i)}
                        className={`cursor-pointer rounded px-0.5 transition-colors ${on ? 'bg-tint font-bold text-ink' : a && i < a.cur ? 'text-muted' : 'text-ink hover:bg-tint/50'}`}
                      >
                        {s}{' '}
                      </span>
                    )
                  })}
                </p>
              )}
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          <Card className="flex flex-col p-6">
            <h3 className="mb-3 text-lg font-extrabold text-ink">Visit info</h3>
            <div className="border-t border-line py-4">
              <p className="text-xs font-semibold text-muted">Opening hours</p>
              <p className="font-bold text-ink">Today {place.hours.today}</p>
              <p className="text-sm text-muted">{place.hours.note}</p>
            </div>
            {ticket && (
              <div className="border-t border-line py-4">
                <p className="text-xs font-semibold text-muted">Your ticket</p>
                <p className="font-bold text-ink">{fmtWeekday(ticket.start)} {fmtDay(ticket.start)} · {fmtTime(ticket.start)} entry · {ticket.guests} adults</p>
                <Link to={`/trips/${trip.id}/bookings?ticket=${ticket.id}`} className="text-sm font-bold text-link">View ticket · {ticket.ref}</Link>
              </div>
            )}
            <div className="border-t border-line pt-4">
              <p className="text-xs font-semibold text-muted">From your hotel</p>
              <p className="font-bold text-ink">{place.fromHotel}</p>
              <button className="text-sm font-bold text-link">Get directions</button>
            </div>
          </Card>

          <div className="flex items-center justify-between">
            <h3 className="text-lg font-extrabold text-ink">Nearby</h3>
            <Link to={`/trips/${trip.id}/plan`} className="text-sm font-bold text-link">See all</Link>
          </div>
          {place.nearby.map((n) => {
            const inner = (
              <>
                <Photo src={placeById(n.id ?? '')?.photo ?? place.photo} alt="" className="h-14 w-16 flex-none rounded-lg" />
                <span className="flex-1">
                  <span className="block font-bold text-ink">{n.name}</span>
                  <span className="block text-sm text-muted">{n.note}</span>
                </span>
                <span className="text-sm font-bold text-ink">{n.walk}</span>
              </>
            )
            return n.id ? (
              <Link key={n.name} to={`/places/${n.id}`} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 hover:shadow-card">{inner}</Link>
            ) : (
              <div key={n.name} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3">{inner}</div>
            )
          })}
          <button className="flex items-center justify-center gap-2 rounded-2xl border border-line bg-surface py-3 font-bold text-ink hover:bg-tint"><Plus size={16} /> Add to plan</button>
        </div>
      </div>
    </div>
  )
}
