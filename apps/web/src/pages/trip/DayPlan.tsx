import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BedDouble, Footprints, GripVertical, Headphones, LocateFixed, MapPin, Plus, Sparkles, TrainFront, TriangleAlert, X } from 'lucide-react'
import type { Trip } from '../../data/types'
import { bookingPos, freeTime, planned } from '../../data/plan'
import { bookingsFor, fmtDay, fmtTime, fmtWeekday, missingNights, tripDays, tripEvents } from '../../lib/trips'
import { Card, typeIcon } from '../../components/ui'

type Item =
  | { kind: 'booking'; key: string; at: string; title: string; subtitle: string; pos?: { x: number; y: number }; ticket: boolean; type: keyof typeof typeIcon; bookingId: string }
  | { kind: 'planned'; key: string; at: string; title: string; subtitle: string; pos: { x: number; y: number }; audio?: boolean }
  | { kind: 'free'; key: string; at: string; end: string; suggestions: { id: string; title: string; meta: string }[] }

const nearby = {
  Food: [
    { name: 'Trattoria da Enzo', meta: '4.6 · €€ · 6 min walk · open until 23:00', why: "Locals' favourite for carbonara, fits your €€ budget" },
    { name: 'Supplì Roma', meta: '4.5 · € · 9 min walk · open until 22:00', why: 'Quick Roman street food between sights' },
    { name: 'Ai Tre Scalini', meta: '4.4 · €€ · 11 min walk · open until 01:00', why: 'Cosy wine bar in Monti, good for an early dinner' },
  ],
  Coffee: [
    { name: "Sant'Eustachio Il Caffè", meta: '4.5 · € · 7 min walk · open until 01:00', why: 'Rome’s classic espresso, close to the Pantheon' },
    { name: 'Faro', meta: '4.7 · € · 12 min walk · open until 17:00', why: 'Specialty coffee if you want a quieter break' },
    { name: 'Tazza d’Oro', meta: '4.4 · € · 8 min walk · open until 20:00', why: 'Try the granita di caffè' },
  ],
  Sights: [
    { name: 'Capitoline Museums', meta: '4.7 · €€ · 8 min walk · 1.5 h', why: 'Best view over the Forum, fits your free time' },
    { name: 'Basilica di San Clemente', meta: '4.8 · € · 10 min walk · 45 min', why: 'Three churches stacked on top of each other' },
    { name: 'Mercati di Traiano', meta: '4.6 · € · 9 min walk · 1 h', why: 'Ancient shopping centre, rarely crowded' },
  ],
} as const

export function DayPlan({ trip }: { trip: Trip }) {
  const days = tripDays(trip)
  const [params, setParams] = useSearchParams()
  const idx = Math.min(Number(params.get('day') ?? 2) - 1, days.length - 1)
  const day = days[Math.max(0, idx)]
  const missing = new Set(missingNights(trip))
  const [nearbyOpen, setNearbyOpen] = useState(false)
  const [askLocation, setAskLocation] = useState(false)
  const [shared, setShared] = useState(false)
  const [category, setCategory] = useState<keyof typeof nearby>('Food')

  const items: Item[] = [
    ...tripEvents(trip.id)
      .filter((e) => e.at.slice(0, 10) === day)
      .map((e) => ({
        kind: 'booking' as const,
        key: e.key,
        at: e.at,
        title: e.booking.title + (e.label ? ` · ${e.label}` : ''),
        subtitle: e.booking.location,
        pos: bookingPos[e.booking.id],
        ticket: e.booking.hasPass,
        type: e.booking.type,
        bookingId: e.booking.id,
      })),
    ...planned.filter((p) => p.tripId === trip.id && p.start.slice(0, 10) === day).map((p) => ({ kind: 'planned' as const, key: p.id, at: p.start, title: p.title, subtitle: p.subtitle, pos: { x: p.x, y: p.y }, audio: p.audioGuide })),
    ...freeTime.filter((f) => f.tripId === trip.id && f.start.slice(0, 10) === day).map((f) => ({ kind: 'free' as const, key: f.id, at: f.start, end: f.end, suggestions: f.suggestions })),
  ].sort((a, b) => a.at.localeCompare(b.at))

  const stops = items.filter((i) => i.kind !== 'free' && i.pos) as Extract<Item, { pos?: { x: number; y: number } }>[]
  const dist = (a?: { x: number; y: number }, b?: { x: number; y: number }) => (a && b ? Math.hypot(a.x - b.x, a.y - b.y) * 0.035 : 0)
  const km = stops.reduce((n, s, i) => n + (i ? dist(stops[i - 1].pos, s.pos) : 0), 0)
  const cost = bookingsFor(trip.id).filter((b) => b.start.slice(0, 10) === day).reduce((n, b) => n + b.price, 0)
  const hotelTonight = bookingsFor(trip.id).find((b) => b.type === 'hotel' && b.start.slice(0, 10) <= day && b.end!.slice(0, 10) > day)
  const isLastDay = day === trip.end

  const connector = (a: Item, b: Item) => {
    const pa = 'pos' in a ? a.pos : undefined
    const pb = 'pos' in b ? b.pos : undefined
    const k = dist(pa, pb)
    if (!k) return null
    const metro = k > 1.2
    return (
      <div className="flex items-center gap-2 py-1 pl-[124px] text-[13px] font-semibold text-muted">
        {metro ? <TrainFront size={14} /> : <Footprints size={14} />}
        {metro ? `Metro · ${Math.round(k * 5)} min` : `${Math.max(3, Math.round(k * 12))} min walk · ${k.toFixed(1)} km`}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        {days.map((dd, i) => (
          <button
            key={dd}
            onClick={() => setParams({ day: String(i + 1) })}
            className={`relative rounded-xl border px-4 py-2 text-center leading-tight transition-colors ${dd === day ? 'border-primary bg-primary text-white dark:text-on-primary' : 'border-line bg-surface text-ink hover:bg-tint'}`}
          >
            <span className="block text-sm font-bold">{fmtWeekday(dd)} {Number(dd.slice(8))}</span>
            <span className={`block text-xs ${dd === day ? 'opacity-80' : 'text-muted'}`}>Day {i + 1}</span>
            {missing.has(dd) && <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-highlight" />}
          </button>
        ))}
        <button
          onClick={() => (shared ? setNearbyOpen(!nearbyOpen) : setAskLocation(true))}
          className={`ml-auto flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold ${nearbyOpen ? 'bg-accent-decor text-white' : 'border border-line bg-surface text-ink hover:bg-tint'}`}
        >
          <LocateFixed size={16} /> Near me
        </button>
      </div>

      <div className="flex items-baseline gap-6">
        <h2 className="text-xl font-extrabold text-ink">{fmtWeekday(day)} {fmtDay(day)}</h2>
        <span className="text-sm font-semibold text-muted">{items.filter((i) => i.kind !== 'free').length} stops</span>
        {km > 0 && <span className="text-sm font-semibold text-muted">{km.toFixed(1)} km walking</span>}
        {cost > 0 && <span className="text-sm font-semibold text-muted">~€{cost}</span>}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_420px] items-start gap-6">
        <div className="flex flex-col">
          {items.length === 0 && <Card className="p-6 text-sm text-muted">Nothing planned yet for this day.</Card>}
          {items.map((it, i) => (
            <div key={it.key}>
              {i > 0 && connector(items[i - 1], it)}
              <div className="group grid grid-cols-[72px_32px_1fr] items-start gap-2 py-1.5">
                <span className="pt-3 text-right text-[15px] font-bold leading-tight text-ink">
                  {fmtTime(it.at)}
                  {it.kind === 'free' && <span className="block text-muted">–{fmtTime(it.end)}</span>}
                </span>
                <span className={`mt-3 grid size-6 place-items-center justify-self-center rounded-full text-[11px] font-bold ${it.kind === 'free' ? 'border-2 border-link bg-surface' : it.kind === 'booking' ? 'bg-primary text-white dark:text-on-primary' : 'bg-link text-white'}`}>
                  {it.kind !== 'free' && stops.findIndex((s) => s.key === it.key) + 1 > 0 ? stops.findIndex((s) => s.key === it.key) + 1 : ''}
                </span>

                {it.kind === 'free' ? (
                  <div className="flex flex-col gap-2.5 rounded-2xl bg-tint/60 p-4">
                    <p className="text-[15px] font-bold text-ink">Free time <span className="font-semibold text-muted">· 3 h · Suggestions nearby</span></p>
                    {it.suggestions.map((s) => (
                      <div key={s.id} className="flex items-center gap-3 rounded-xl border border-dashed border-link/50 bg-surface px-4 py-3">
                        <Sparkles size={16} className="text-accent-decor" />
                        <div className="flex-1">
                          <p className="text-sm font-bold text-ink">{s.title}</p>
                          <p className="text-xs text-muted">{s.meta}</p>
                        </div>
                        <button className="rounded-lg border border-line px-3 py-1.5 text-[13px] font-bold text-ink hover:bg-tint">Add to plan</button>
                        <button aria-label="Dismiss" className="text-muted hover:text-ink"><X size={15} /></button>
                      </div>
                    ))}
                    <button onClick={() => (shared ? setNearbyOpen(true) : setAskLocation(true))} className="self-start text-[13px] font-bold text-link">Find something nearby ›</button>
                  </div>
                ) : (
                  <div className={`relative flex flex-col gap-2 rounded-2xl border p-4 ${it.kind === 'booking' ? 'border-tint bg-tint' : 'border-line bg-surface'}`}>
                    <GripVertical size={16} className="absolute -left-5 top-4 text-muted opacity-0 group-hover:opacity-100" aria-label="Drag to reorder" />
                    <div className="flex items-start gap-3">
                      {it.kind === 'booking' ? (
                        (() => {
                          const Icon = typeIcon[it.type]
                          return <span className="grid size-10 flex-none place-items-center rounded-xl bg-surface text-primary"><Icon size={18} /></span>
                        })()
                      ) : (
                        <span className="grid size-10 flex-none place-items-center rounded-xl bg-tint text-link"><MapPin size={18} /></span>
                      )}
                      <div className="flex-1">
                        <p className="text-base font-bold text-ink">{it.title}</p>
                        <p className="text-sm text-muted">{it.subtitle}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${it.kind === 'booking' ? 'bg-primary text-white dark:text-on-primary' : 'border border-line text-muted'}`}>
                        {it.kind === 'booking' ? 'Booked' : 'Planned'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 pl-[52px]">
                      {((it.kind === 'planned' && it.audio) || (it.kind === 'booking' && it.type === 'museum')) && (
                        <Link to="/places/colosseum" className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs font-bold text-ink hover:bg-tint">
                          <Headphones size={13} /> Audio guide · 2 min
                        </Link>
                      )}
                      {it.kind === 'booking' && (
                        <Link to={`/trips/${trip.id}/bookings?${it.ticket ? 'ticket' : 'open'}=${it.bookingId}`} className="ml-auto text-[13px] font-bold text-link">
                          {it.ticket ? 'View ticket ›' : 'View booking ›'}
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {!isLastDay && (
            <div className="grid grid-cols-[72px_32px_1fr] items-center gap-2 py-1.5">
              <span className="text-right text-[15px] font-bold text-muted">~22:00</span>
              <span className="size-6 justify-self-center rounded-full border-2 border-muted" />
              {hotelTonight ? (
                <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
                  <BedDouble size={18} className="text-primary" />
                  <span className="flex-1 font-bold text-ink">{hotelTonight.title}</span>
                  <span className="text-[13px] text-muted">End of day</span>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-2xl border border-dashed border-highlight bg-highlight-soft px-4 py-3 text-on-highlight-soft">
                  <TriangleAlert size={18} />
                  <span className="flex-1 font-bold">No hotel for tonight</span>
                  <Link to="/suggestions" className="text-sm font-extrabold">Add hotel ›</Link>
                </div>
              )}
            </div>
          )}

          <button className="ml-[112px] mt-3 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-link/60 py-3 text-[15px] font-bold text-link hover:bg-tint/50">
            <Plus size={16} /> Add stop
          </button>
        </div>

        <div className="sticky top-[100px]">
          {nearbyOpen ? (
            <NearbyPanel category={category} setCategory={setCategory} onClose={() => setNearbyOpen(false)} />
          ) : (
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4">
                <h3 className="font-bold text-ink">Day {idx + 1} route</h3>
                <span className="flex gap-3 text-xs font-semibold text-muted">
                  <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-primary" /> Booked</span>
                  <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-link" /> Planned</span>
                </span>
              </div>
              <DayMap stops={stops.map((s) => ({ key: s.key, title: s.title, pos: s.pos!, booked: s.kind === 'booking' }))} />
            </Card>
          )}
        </div>
      </div>

      {askLocation && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-6" onClick={() => setAskLocation(false)}>
          <div className="flex w-[420px] flex-col items-center gap-4 rounded-2xl bg-surface p-8 text-center shadow-card" onClick={(e) => e.stopPropagation()}>
            <span className="grid size-14 place-items-center rounded-2xl bg-tint text-primary"><LocateFixed size={26} /></span>
            <h3 className="text-xl font-extrabold text-ink">Find places near you</h3>
            <p className="text-sm text-muted">We use your location only for this search. It is not stored.</p>
            <button onClick={() => { setShared(true); setAskLocation(false); setNearbyOpen(true) }} className="w-full rounded-xl bg-highlight py-3 font-bold text-white">Share location</button>
            <button onClick={() => { setShared(true); setAskLocation(false); setNearbyOpen(true) }} className="w-full rounded-xl border border-line py-3 font-bold text-ink hover:bg-tint">Use hotel location</button>
            <button onClick={() => setAskLocation(false)} className="text-sm font-bold text-muted">Not now</button>
          </div>
        </div>
      )}
    </div>
  )
}

function DayMap({ stops }: { stops: { key: string; title: string; pos: { x: number; y: number }; booked: boolean }[] }) {
  return (
    <div className="relative aspect-[4/3.6] bg-map-land">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full">
        {[15, 32, 50, 68, 85].map((v) => <line key={'h' + v} x1="0" x2="100" y1={v} y2={v + 4} stroke="var(--c-border)" strokeWidth=".8" />)}
        {[12, 30, 55, 78].map((v) => <line key={'v' + v} y1="0" y2="100" x1={v} x2={v + 6} stroke="var(--c-border)" strokeWidth=".8" />)}
        <path d="M20 0 C 30 25, 18 45, 28 60 S 26 85, 32 100" fill="none" stroke="var(--c-accent-decor)" strokeOpacity=".3" strokeWidth="4" />
        <ellipse cx="66" cy="74" rx="13" ry="11" fill="var(--c-success)" opacity=".12" />
        {stops.length > 1 && (
          <polyline points={stops.map((s) => `${s.pos.x},${s.pos.y}`).join(' ')} fill="none" stroke="var(--c-link)" strokeWidth="1" strokeDasharray="2 1.5" />
        )}
      </svg>
      {stops.map((s, i) => (
        <span key={s.key} className="absolute flex -translate-x-1/2 -translate-y-full flex-col items-center" style={{ left: `${s.pos.x}%`, top: `${s.pos.y}%` }}>
          <span className="mb-0.5 whitespace-nowrap rounded-md bg-surface/90 px-1.5 text-[11px] font-bold text-ink shadow-sm">{s.title.split(' · ')[0].replace('Dinner', 'Dinner').slice(0, 22)}</span>
          <span className={`grid size-6 place-items-center rounded-full text-[11px] font-bold text-white ring-2 ring-white ${s.booked ? 'bg-primary dark:text-on-primary' : 'bg-link'}`}>{i + 1}</span>
        </span>
      ))}
      <button className="absolute bottom-3 left-3 rounded-lg bg-surface px-3 py-1.5 text-[13px] font-bold text-ink shadow-pop">Open in Maps</button>
    </div>
  )
}

function NearbyPanel({ category, setCategory, onClose }: { category: keyof typeof nearby; setCategory: (c: keyof typeof nearby) => void; onClose: () => void }) {
  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-ink">Nearby</h3>
          <p className="text-xs text-muted">Via dei Fori Imperiali · <button className="font-bold text-link">Change location</button></p>
        </div>
        <button onClick={onClose} aria-label="Close" className="text-muted hover:text-ink"><X size={18} /></button>
      </div>
      <div className="flex gap-2">
        {(Object.keys(nearby) as (keyof typeof nearby)[]).map((c) => (
          <button key={c} onClick={() => setCategory(c)} className={`rounded-full px-3.5 py-1.5 text-[13px] font-bold ${c === category ? 'bg-primary text-white dark:text-on-primary' : 'border border-line text-ink hover:bg-tint'}`}>{c}</button>
        ))}
      </div>
      <div className="flex gap-2 text-xs font-bold text-muted">
        <span className="rounded-lg bg-tint px-2.5 py-1 text-primary">€€ budget</span>
        <span className="rounded-lg bg-tint px-2.5 py-1 text-primary">10 min walk</span>
        <span className="rounded-lg bg-tint px-2.5 py-1 text-primary">Open now</span>
      </div>
      {nearby[category].map((p, i) => (
        <div key={p.name} className="flex flex-col gap-2 rounded-xl border border-line p-4">
          <div className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-full bg-highlight text-[11px] font-bold text-white">{i + 1}</span>
            <p className="font-bold text-ink">{p.name}</p>
          </div>
          <p className="text-xs text-muted">{p.meta}</p>
          <p className="text-[13px] italic text-ink">{p.why}</p>
          <div className="flex gap-2">
            <button className="rounded-lg bg-highlight px-3 py-1.5 text-[13px] font-bold text-white">Add to plan</button>
            <button className="rounded-lg border border-line px-3 py-1.5 text-[13px] font-bold text-ink hover:bg-tint">Directions</button>
          </div>
        </div>
      ))}
      <button className="text-[13px] font-bold text-link">Show 3 different ideas ↻</button>
    </Card>
  )
}
