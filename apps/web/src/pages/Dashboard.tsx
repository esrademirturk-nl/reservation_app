import { Link } from 'react-router-dom'
import { ArrowRight, BedDouble, CalendarClock, ChevronRight, Copy, Inbox, Plane, Plus, Sun, TriangleAlert } from 'lucide-react'
import { bookings, user } from '../data/demo'
import {
  bookingsFor,
  daysUntil,
  deadlines,
  fmtDay,
  fmtLongToday,
  fmtRange,
  fmtTime,
  gaps,
  nextTrip,
  nights,
  readiness,
  recentlyAdded,
  relativeAdded,
  sourceLabel,
  stats,
  upcomingTrips,
} from '../lib/trips'
import { TripsMap } from '../components/TripsMap'
import { Card, IconTile, Photo, ReadinessBar, typeIcon } from '../components/ui'
import type { Trip } from '../data/types'

export function Dashboard() {
  const trips = upcomingTrips()
  const next = nextTrip()
  const later = trips.filter((t) => t.id !== next?.id)
  const firstGap = gaps()[0]

  return (
    <div className="mx-auto flex max-w-[1120px] flex-col gap-7">
      <div>
        <h1 className="text-[26px] sm:text-[32px] font-extrabold tracking-tight text-ink">Good evening, {user.firstName}</h1>
        <p className="mt-1 text-[15px] text-muted">
          {fmtLongToday()} · {trips.length} trips coming up
        </p>
      </div>

      {next && <Hero trip={next} />}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
            <h2 className="text-base font-bold text-ink">Your trips on the map</h2>
            <div className="flex gap-4 text-[13px] font-semibold text-muted">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-highlight" />
                Next trip
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-primary" />
                Upcoming
              </span>
            </div>
          </div>
          <TripsMap trips={trips} nextId={next?.id} />
        </Card>

        <div className="flex flex-col gap-5">
          {firstGap ? (
            <Link
              to={`/trips/${firstGap.tripId}/bookings`}
              className="flex flex-1 flex-col gap-3.5 rounded-2xl bg-highlight-soft px-6 py-5 text-on-highlight-soft transition-transform hover:-translate-y-0.5"
            >
              <span className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-xl bg-surface">
                  <TriangleAlert size={20} className="text-on-highlight-soft" />
                </span>
                <span className="text-sm font-bold">Needs attention</span>
              </span>
              <span className="flex flex-col gap-1">
                <span className="text-lg font-extrabold">{firstGap.title}</span>
                <span className="text-sm">{firstGap.detail}</span>
              </span>
              <span className="mt-auto flex items-center gap-1 text-sm font-extrabold">
                Find a hotel <ArrowRight size={15} />
              </span>
            </Link>
          ) : (
            <Card className="flex-1 p-6 text-sm text-muted">All trips are covered. Nice!</Card>
          )}
          <StatsCard />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ComingUp />
        <RecentlyAdded />
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[22px] font-extrabold tracking-tight text-ink">Upcoming trips</h2>
          <Link to="/trips" className="text-sm font-bold text-link">
            See all trips
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {later.map((t) => (
            <TripCard key={t.id} trip={t} />
          ))}
        </div>
      </section>
    </div>
  )
}

function Hero({ trip }: { trip: Trip }) {
  const bs = bookingsFor(trip.id)
  const ready = readiness(trip)
  const flight = bs.find((b) => b.type === 'flight' && b.start.slice(0, 10) === trip.start)
  const hotel = bs.find((b) => b.type === 'hotel')
  const missing = gaps().find((g) => g.tripId === trip.id)

  const chip = 'flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-[13px] font-bold text-white backdrop-blur-md transition-colors hover:bg-white/20'

  return (
    <section className="relative min-h-[340px] overflow-hidden rounded-[20px] bg-hero">
      <Photo src={trip.photo} alt={trip.city} className="!absolute inset-0 sm:left-auto sm:w-[65%]" />
      {/* solid brand blue on the left 35%, soft fade to transparent at 70% */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(90deg, var(--c-hero) 0%, var(--c-hero) 35%, color-mix(in srgb, var(--c-hero) 70%, transparent) 50%, transparent 70%)' }}
      />
      {/* on phones the photo sits behind the text, so darken it evenly */}
      <div className="absolute inset-0 bg-hero/75 sm:hidden"
      />

      <div className="relative flex max-w-[520px] flex-col gap-4 p-6 sm:p-10">
        <span className="w-fit rounded-full bg-highlight-soft px-3 py-1 text-xs font-extrabold tracking-[0.12em] text-highlight">
          IN {daysUntil(trip.start)} DAYS
        </span>
        <div>
          <h2 className="text-[34px] sm:text-[48px] font-extrabold leading-none tracking-tight text-white">
            {trip.city}, {trip.country}
          </h2>
          <p className="mt-3 flex items-center gap-2 text-[15px] font-medium text-white/80">
            {fmtRange(trip)} · {nights(trip)} nights
            {trip.weatherC != null && (
              <>
                {' · '}
                <Sun size={15} /> {trip.weatherC}°
              </>
            )}
          </p>
        </div>

        <div className="flex max-w-[240px] items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-accent-decor" style={{ width: `${(ready.done / ready.total) * 100}%` }} />
          </div>
          <span className="text-xs font-bold text-white/85">
            Ready {ready.done}/{ready.total}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {flight && (
            <Link to="/wallet" className={chip}>
              <Plane size={14} /> Flight {fmtDay(flight.start)} {fmtTime(flight.start)} <ChevronRight size={14} />
            </Link>
          )}
          {hotel && (
            <Link to={`/trips/${trip.id}/bookings`} className={chip}>
              <BedDouble size={14} /> Hotel check-in {fmtTime(hotel.start)} <ChevronRight size={14} />
            </Link>
          )}
          {missing && (
            <Link
              to="/suggestions"
              className="flex items-center gap-2 rounded-full bg-[#FDE7DF] px-3.5 py-1.5 text-[13px] font-bold text-[#B5482C] hover:brightness-95"
            >
              <TriangleAlert size={14} /> Add hotel for {fmtDay(missing.date)} <ChevronRight size={14} />
            </Link>
          )}
        </div>

        <div className="mt-1 flex flex-wrap gap-3">
          <Link to={`/trips/${trip.id}/plan`} className="rounded-xl bg-highlight px-5 py-3 text-[15px] font-bold text-white hover:brightness-110">
            View day plan
          </Link>
          <button className="flex items-center gap-2 rounded-xl border border-white/40 px-5 py-3 text-[15px] font-bold text-white hover:bg-white/10">
            <Plus size={16} /> Add booking
          </button>
        </div>
      </div>
      <span className="absolute bottom-3 right-4 text-[11px] font-medium text-white/70">Photo: {trip.photoCredit}</span>
    </section>
  )
}

function StatsCard() {
  const s = stats()
  const items = [
    [s.upcoming, 'upcoming'],
    [s.bookings, 'bookings'],
    [s.countries, 'countries'],
  ] as const
  return (
    <Card className="flex flex-col gap-3 px-6 py-5">
      <span className="text-[13px] font-bold text-muted">At a glance</span>
      <div className="grid grid-cols-3">
        {items.map(([n, label], i) => (
          <div key={label} className={`flex flex-col gap-0.5 ${i ? 'border-l border-line pl-3.5' : ''}`}>
            <span className="text-[26px] font-extrabold tracking-tight text-ink">{n}</span>
            <span className="text-[13px] font-semibold text-muted">{label}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

function ComingUp() {
  const items = deadlines(3)
  return (
    <Card className="flex flex-col gap-4 px-6 py-5">
      <div className="flex items-center gap-2.5">
        <IconTile>
          <CalendarClock size={16} />
        </IconTile>
        <h2 className="text-[17px] font-bold text-ink">Coming up</h2>
      </div>
      <ol className="relative flex flex-col gap-5 before:absolute before:bottom-2 before:left-[74px] before:top-2 before:w-px before:bg-line">
        {items.map((d, i) => {
          const soon = daysUntil(d.date)
          const urgent = i === 0 && soon <= 10
          return (
            <li key={d.date + d.title} className="group relative grid grid-cols-[60px_28px_1fr] items-start">
              <span className="pt-0.5 text-sm font-bold text-ink">{fmtDay(d.date)}</span>
              <span className={`relative z-10 mt-1 size-3.5 justify-self-center rounded-full border-[3px] bg-surface ${urgent ? 'border-highlight' : 'border-link'}`} />
              <Link to={d.bookingId ? `/trips/${bookings.find((b) => b.id === d.bookingId)?.tripId}/bookings` : '/trips'} className="flex items-start justify-between gap-2">
                <span>
                  <span className="flex items-center gap-2 text-[15px] font-bold text-ink group-hover:text-link">
                    {d.title}
                    {urgent && <span className="rounded-full bg-highlight-soft px-2 py-0.5 text-[11px] font-bold text-highlight">in {soon} days</span>}
                  </span>
                  <span className="text-[13px] text-muted">{d.subtitle}</span>
                </span>
                <ChevronRight size={16} className="mt-1 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            </li>
          )
        })}
      </ol>
      <Link to="/trips" className="mt-auto self-end text-sm font-bold text-link">
        See all →
      </Link>
    </Card>
  )
}

function RecentlyAdded() {
  const items = recentlyAdded(3)
  return (
    <Card className="flex flex-col gap-4 px-6 py-5">
      <div className="flex items-center gap-2.5">
        <IconTile>
          <Inbox size={16} />
        </IconTile>
        <h2 className="text-[17px] font-bold text-ink">Recently added</h2>
      </div>
      <ul className="flex flex-col gap-4">
        {items.map((b, i) => {
          const Icon = typeIcon[b.type]
          return (
            <li key={b.id} className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-[10px] bg-tint text-primary">
                <Icon size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-[15px] font-bold text-ink">
                  {b.title}
                  {i === 0 && <span className="rounded-full bg-accent-decor px-2 py-0.5 text-[11px] font-bold text-white">New</span>}
                </span>
                <span className="text-[13px] text-muted">{sourceLabel(b)}</span>
              </span>
              <span className="text-[13px] text-muted">{relativeAdded(b.addedAt)}</span>
            </li>
          )
        })}
      </ul>
      <div className="mt-auto flex flex-wrap items-center gap-3 rounded-xl bg-bg px-4 py-3 text-[13px] text-muted">
        Forward booking emails to <b className="text-ink">{user.forwardAddress}</b>
        <button
          onClick={() => navigator.clipboard?.writeText(user.forwardAddress)}
          className="ml-auto flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 font-bold text-ink hover:bg-tint"
        >
          <Copy size={13} /> Copy
        </button>
      </div>
    </Card>
  )
}

function TripCard({ trip }: { trip: Trip }) {
  const bs = bookingsFor(trip.id)
  const r = readiness(trip)
  const types = [...new Set(bs.map((b) => b.type))]
  return (
    <Link to={`/trips/${trip.id}`} className="group overflow-hidden rounded-2xl border border-line bg-surface transition-shadow hover:shadow-card">
      <div className="relative">
        <Photo src={trip.photo} alt={trip.city} className="h-[150px]" />
        <span className="absolute left-3 top-3 rounded-lg bg-primary/85 px-2.5 py-1 text-xs font-bold text-white backdrop-blur dark:bg-hero/85">
          In {daysUntil(trip.start)} days
        </span>
      </div>
      <div className="flex flex-col gap-3 p-5">
        <div>
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{trip.country}</span>
          <h3 className="text-xl font-extrabold text-ink">{trip.city}</h3>
          <p className="text-sm text-muted">
            {fmtRange(trip, true)} · {nights(trip)} nights
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {types.map((t) => {
            const Icon = typeIcon[t]
            return (
              <span key={t} className="grid size-7 place-items-center rounded-md bg-tint text-primary">
                <Icon size={14} />
              </span>
            )
          })}
          <span className="ml-1 text-[13px] font-semibold text-muted">
            {bs.length} booking{bs.length === 1 ? '' : 's'}
          </span>
        </div>
        <ReadinessBar done={r.done} total={r.total} />
      </div>
      <div className="flex items-center justify-between border-t border-line px-5 py-3 text-[13px] font-bold">
        {r.missing === 0 ? (
          <span className="text-success">All set</span>
        ) : (
          <span className="rounded-full bg-highlight-soft px-2.5 py-0.5 text-highlight">{r.missing} missing</span>
        )}
        <span className="text-link group-hover:underline">Open planner →</span>
      </div>
    </Link>
  )
}
