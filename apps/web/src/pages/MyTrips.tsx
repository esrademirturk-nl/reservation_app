import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CalendarDays, LayoutGrid, List, MoreHorizontal, Plus, Search, Inbox } from 'lucide-react'
import type { Trip } from '../data/types'
import { bookingsFor, completedTrips, daysUntil, fmtDay, fmtRange, fmtTime, nights, readiness, upcomingTrips } from '../lib/trips'
import { Card, Photo, typeIcon } from '../components/ui'

type Tab = 'upcoming' | 'past' | 'unsorted'

export function MyTrips() {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'upcoming'
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [q, setQ] = useState('')

  const match = (t: Trip) => `${t.city} ${t.country}`.toLowerCase().includes(q.toLowerCase())
  const upcoming = upcomingTrips().filter(match)
  const past = completedTrips().filter(match)
  const unsorted = bookingsFor('unsorted')
  const tabs: { id: Tab; label: string; n: number }[] = [
    { id: 'upcoming', label: 'Upcoming', n: upcomingTrips().length },
    { id: 'past', label: 'Past', n: completedTrips().length },
    { id: 'unsorted', label: 'Unsorted', n: unsorted.length },
  ]
  const list = tab === 'upcoming' ? upcoming : past

  return (
    <div className="mx-auto flex max-w-[1120px] flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-[26px] sm:text-[32px] font-extrabold tracking-tight text-ink">My trips</h1>
          <p className="mt-1 text-[15px] text-muted">All your trips in one place</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex min-w-0 flex-1 md:w-60 md:flex-none items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-muted">
            <Search size={16} />
            <input value={q} onChange={(e) => setQ(e.target.value)} className="w-full bg-transparent text-ink outline-none placeholder:text-muted" placeholder="Search trips" />
          </label>
          <div className="flex rounded-xl border border-line bg-surface p-1">
            {(['grid', 'list'] as const).map((v) => (
              <button key={v} aria-label={`${v} view`} onClick={() => setView(v)} className={`grid size-8 place-items-center rounded-lg ${view === v ? 'bg-tint text-ink' : 'text-muted'}`}>
                {v === 'grid' ? <LayoutGrid size={16} /> : <List size={16} />}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-2 rounded-xl bg-highlight px-4 py-2.5 text-sm font-bold text-white hover:brightness-110"><Plus size={16} /> New trip</button>
        </div>
      </div>

      <div className="flex gap-6 overflow-x-auto border-b border-line sm:gap-8">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setParams(t.id === 'upcoming' ? {} : { tab: t.id })} className={`-mb-px border-b-2 pb-3 text-[15px] font-bold ${tab === t.id ? 'border-primary text-ink' : 'border-transparent text-muted hover:text-ink'}`}>
            {t.label} <span className="ml-1 rounded-md bg-tint px-1.5 text-xs text-primary">{t.n}</span>
          </button>
        ))}
      </div>

      {tab === 'past' && past.length > 0 && (
        <p className="text-sm font-semibold text-muted">
          {past.length} trip · {new Set(past.map((t) => t.countryCode)).size} country · {past.reduce((n, t) => n + nights(t), 0)} nights
        </p>
      )}

      {tab === 'unsorted' ? (
        <div className="flex flex-col gap-3">
          <Card className="flex items-center gap-3 bg-tint/50 px-5 py-4 text-sm text-ink">
            <Inbox size={18} className="text-primary" />
            These bookings don't match any trip yet. Add them to a trip or create a new one.
          </Card>
          {unsorted.map((b) => {
            const Icon = typeIcon[b.type]
            return (
              <Card key={b.id} className="flex flex-wrap items-center gap-4 p-4">
                <span className="grid size-11 place-items-center rounded-xl bg-tint text-primary"><Icon size={20} /></span>
                <div className="flex-1">
                  <p className="font-bold text-ink">{b.title}</p>
                  <p className="text-sm text-muted">{fmtDay(b.start)} {b.start.slice(0, 4)} · {fmtTime(b.start)} · {b.location}</p>
                </div>
                <button className="rounded-lg border border-line px-3 py-2 text-[13px] font-bold text-ink hover:bg-tint">Add to trip</button>
                <button className="rounded-lg bg-primary px-3 py-2 text-[13px] font-bold text-white dark:text-on-primary">Create trip</button>
              </Card>
            )
          })}
        </div>
      ) : list.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-12 text-center">
          <CalendarDays size={28} className="text-muted" />
          <p className="font-bold text-ink">{q ? 'No trips match your search' : tab === 'past' ? 'No past trips yet' : 'No upcoming trips'}</p>
        </Card>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((t) => <GridCard key={t.id} trip={t} past={tab === 'past'} />)}
        </div>
      ) : (
        <Card className="divide-y divide-line">
          {list.map((t) => <ListRow key={t.id} trip={t} past={tab === 'past'} />)}
        </Card>
      )}
    </div>
  )
}

function Status({ trip, past }: { trip: Trip; past: boolean }) {
  if (past) return <span className="rounded-full bg-tint px-2.5 py-0.5 text-xs font-bold text-muted">Completed</span>
  const r = readiness(trip)
  return r.missing === 0 ? (
    <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-bold text-success">Ready</span>
  ) : (
    <span className="rounded-full bg-highlight-soft px-2.5 py-0.5 text-xs font-bold text-highlight">{r.missing} missing</span>
  )
}

function GridCard({ trip, past }: { trip: Trip; past: boolean }) {
  const n = bookingsFor(trip.id).length
  return (
    <Link to={`/trips/${trip.id}`} className="group overflow-hidden rounded-2xl border border-line bg-surface transition-shadow hover:shadow-card">
      <div className="relative">
        <Photo src={trip.photo} alt={trip.city} className={`h-[170px] ${past ? 'grayscale-[40%]' : ''}`} />
        <span className="absolute left-3 top-3 rounded-lg bg-primary/85 px-2.5 py-1 text-xs font-bold text-white backdrop-blur dark:bg-hero/85">
          {past ? fmtRange(trip, true) : `In ${daysUntil(trip.start)} days`}
        </span>
        <span className="absolute right-3 top-3 grid size-8 place-items-center rounded-lg bg-surface/90 text-ink opacity-0 transition-opacity group-hover:opacity-100"><MoreHorizontal size={16} /></span>
      </div>
      <div className="flex flex-col gap-2 p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-xl font-extrabold text-ink">{trip.city}</h3>
            <p className="text-sm text-muted">{trip.country}</p>
          </div>
          <Status trip={trip} past={past} />
        </div>
        <p className="text-sm text-muted">{fmtRange(trip, true)} · {nights(trip)} nights · {n} booking{n === 1 ? '' : 's'}</p>
      </div>
    </Link>
  )
}

function ListRow({ trip, past }: { trip: Trip; past: boolean }) {
  return (
    <Link to={`/trips/${trip.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-tint/40">
      <Photo src={trip.photo} alt={trip.city} className="h-12 w-16 rounded-lg" />
      <span className="w-36 font-bold text-ink sm:w-48">{trip.city}, {trip.country}</span>
      <span className="hidden w-48 text-sm text-muted md:block">{fmtRange(trip, true)}</span>
      <span className="hidden w-28 text-sm text-muted md:block">{bookingsFor(trip.id).length} bookings</span>
      <span className="flex-1"><Status trip={trip} past={past} /></span>
      {!past && <span className="hidden text-sm font-bold text-ink sm:block">In {daysUntil(trip.start)} days</span>}
    </Link>
  )
}
