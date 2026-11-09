import { Link, NavLink, useParams } from 'react-router-dom'
import { Plus, Share2, Users } from 'lucide-react'
import { bookingsFor, daysUntil, fmtWeekday, nights, tripById } from '../../lib/trips'
import { Photo } from '../../components/ui'
import { Overview } from './Overview'
import { DayPlan } from './DayPlan'
import { Bookings } from './Bookings'
import { Documents, documentsFor } from './Documents'
import { TravelBook } from './TravelBook'

type Tab = 'overview' | 'plan' | 'bookings' | 'documents' | 'book'

const MONTH = (iso: string) => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(iso.slice(5, 7)) - 1]

export function TripDetail({ tab }: { tab: Tab }) {
  const { tripId = '' } = useParams()
  const trip = tripById(tripId)
  if (!trip) return <p className="text-muted">Trip not found. <Link to="/trips" className="font-bold text-link">Back to My trips</Link></p>

  const bs = bookingsFor(trip.id)
  const until = daysUntil(trip.start)
  const tabs = [
    { to: `/trips/${trip.id}`, label: 'Overview', end: true },
    { to: `/trips/${trip.id}/plan`, label: 'Day plan' },
    { to: `/trips/${trip.id}/bookings`, label: 'Bookings', count: bs.length },
    { to: `/trips/${trip.id}/documents`, label: 'Documents', count: documentsFor(trip.id).length },
    { to: `/trips/${trip.id}/book`, label: 'Travel book', badge: 'New' },
  ]

  return (
    <div className="mx-auto flex max-w-[1120px] flex-col gap-6">
      <nav className="flex items-center gap-2 text-sm">
        <Link to="/trips" className="font-semibold text-link">My trips</Link>
        <span className="text-muted">/</span>
        <span className="text-muted">{trip.city}, {trip.country}</span>
      </nav>

      <section className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="relative h-[160px] sm:h-[220px]">
          <Photo src={trip.photo} alt={trip.city} className="!absolute inset-0" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
          <span className="absolute bottom-3 right-4 text-[11px] font-medium text-white/75">Photo: {trip.photoCredit}</span>
        </div>
        <div className="flex flex-col gap-4 px-5 pb-5 pt-5 sm:px-7 md:flex-row md:items-end md:justify-between md:gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[26px] font-extrabold tracking-tight sm:text-[34px] text-ink">{trip.city}, {trip.country}</h1>
              {until > 0 ? <span className="rounded-full bg-tint px-3 py-1 text-[13px] font-bold text-primary">In {until} days</span> : daysUntil(trip.end) < 0 ? <span className="rounded-full bg-tint px-3 py-1 text-[13px] font-bold text-muted">Completed</span> : null}
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px] text-muted sm:text-[15px]">
              <span>
                {fmtWeekday(trip.start)} {Number(trip.start.slice(8))} – {fmtWeekday(trip.end)} {Number(trip.end.slice(8))} {MONTH(trip.end)} {trip.end.slice(0, 4)} · {nights(trip)} nights
              </span>
              <span className="flex items-center gap-1.5"><Users size={15} /> {trip.travelers} travelers</span>
              <span>{bs.length} bookings</span>
            </p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-[15px] font-bold text-ink hover:bg-tint"><Share2 size={16} /> Share</button>
            <button className="flex items-center gap-2 rounded-xl bg-highlight px-5 py-2.5 text-[15px] font-bold text-white hover:brightness-110"><Plus size={16} /> Add booking</button>
          </div>
        </div>
        <div className="flex gap-6 overflow-x-auto border-t border-line px-5 sm:gap-8 sm:px-7">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `-mb-px flex flex-none items-center gap-2 whitespace-nowrap border-b-2 py-3.5 text-[15px] font-bold ${isActive ? 'border-primary text-ink' : 'border-transparent text-muted hover:text-ink'}`
              }
            >
              {t.label}
              {'count' in t && t.count != null && <span className="rounded-md bg-tint px-1.5 text-xs text-primary">{t.count}</span>}
              {'badge' in t && <span className="rounded-full bg-accent-decor px-2 text-[11px] text-white">{t.badge}</span>}
            </NavLink>
          ))}
        </div>
      </section>

      {tab === 'overview' && <Overview trip={trip} />}
      {tab === 'plan' && <DayPlan trip={trip} />}
      {tab === 'bookings' && <Bookings trip={trip} />}
      {tab === 'documents' && <Documents trip={trip} />}
      {tab === 'book' && <TravelBook trip={trip} />}
    </div>
  )
}
