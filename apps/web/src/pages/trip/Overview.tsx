import { Link } from 'react-router-dom'
import { FileText, Sparkles, TriangleAlert } from 'lucide-react'
import type { Trip } from '../../data/types'
import { bookingPos, tripSuggestions } from '../../data/plan'
import { fmtDay, fmtDayLong, fmtTime, missingNights, tripDays, tripEvents } from '../../lib/trips'
import { Card, typeIcon } from '../../components/ui'

const typeLabel = { flight: 'Flight', hotel: 'Hotel', train: 'Train', museum: 'Museum', restaurant: 'Restaurant', tour: 'Tour' }

export function Overview({ trip }: { trip: Trip }) {
  const events = tripEvents(trip.id)
  const missing = new Set(missingNights(trip))
  const days = tripDays(trip)
  const mapStops = events.filter((e) => bookingPos[e.booking.id] && e.label !== 'Check-out')

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <ol className="relative flex flex-col gap-6 before:absolute before:bottom-4 before:left-[11px] before:top-3 before:w-0.5 before:bg-line">
        {days.map((day, i) => {
          const dayEvents = events.filter((e) => e.at.slice(0, 10) === day)
          return (
            <li key={day} className="relative flex flex-col gap-3 pl-10">
              <span className="absolute left-0 top-0.5 size-6 rounded-full border-4 border-bg bg-primary" />
              <h3 className="text-lg font-extrabold text-ink">
                {fmtDayLong(day)} <span className="ml-1 text-[13px] font-semibold text-muted">Day {i + 1} · {dayEvents.length} booking{dayEvents.length === 1 ? '' : 's'}</span>
              </h3>

              {dayEvents.map((e) => {
                const b = e.booking
                const Icon = typeIcon[b.type]
                const time = e.label === 'Check-in' ? `From ${fmtTime(e.at)}` : e.label === 'Check-out' ? `Until ${fmtTime(e.at)}` : b.end ? `${fmtTime(b.start)} → ${fmtTime(b.end)}` : fmtTime(b.start)
                return (
                  <Card key={e.key} className="flex gap-4 p-4 transition-shadow hover:shadow-card">
                    <span className="grid size-11 flex-none place-items-center rounded-xl bg-tint text-primary"><Icon size={20} /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                        <div>
                          <span className="text-xs font-semibold text-muted">{typeLabel[b.type]}</span>
                          <p className="text-base font-bold text-ink">{b.title}{e.label && ` · ${e.label}`}</p>
                        </div>
                        <span className="whitespace-nowrap text-[15px] font-bold text-ink">
                          {time}
                          {b.guests && b.type === 'restaurant' ? ` · ${b.guests} guests` : ''}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm text-muted">{b.location}</p>
                      <div className="mt-2 flex items-center gap-6 text-[13px]">
                        <span className="text-muted">Ref <b className="text-ink">{b.ref}</b></span>
                        <Link to={`/trips/${trip.id}/bookings?open=${b.id}`} className="flex items-center gap-1 font-bold text-link"><FileText size={13} /> View booking</Link>
                      </div>
                    </div>
                  </Card>
                )
              })}

              {missing.has(day) && (
                <div className="flex flex-wrap items-center gap-4 rounded-xl border border-dashed border-highlight bg-highlight-soft px-5 py-4 text-on-highlight-soft">
                  <TriangleAlert size={20} className="flex-none" />
                  <div className="flex-1">
                    <p className="font-bold">No place to stay for the night of {fmtDay(day)}</p>
                    <p className="text-sm">You check out at 11:00 and fly home the next day.</p>
                  </div>
                  <Link to="/suggestions" className="rounded-lg bg-on-highlight-soft px-4 py-2 text-sm font-bold text-highlight-soft">Find a hotel</Link>
                </div>
              )}
            </li>
          )
        })}
      </ol>

      <div className="flex flex-col gap-5">
        <Card className="flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-base font-bold text-ink"><Sparkles size={16} className="text-accent-decor" /> Suggestions for this trip</h3>
            <span className="text-xs font-bold text-muted">{tripSuggestions.length} new</span>
          </div>
          <p className="text-[13px] text-muted">Based on your bookings, times and where you'll be each day.</p>
          {tripSuggestions.map((s) => (
            <div key={s.id} className="flex flex-col gap-2 rounded-xl border border-line p-4">
              <p className="text-[15px] font-bold leading-snug text-ink">{s.title}</p>
              <span className="text-xs font-bold text-accent">{s.when}</span>
              <p className="text-[13px] leading-relaxed text-muted">{s.text}</p>
              <div className="flex gap-3">
                <button className="rounded-lg border border-line px-3 py-1.5 text-[13px] font-bold text-ink hover:bg-tint">Add to plan</button>
                <button className="px-1 text-[13px] font-semibold text-muted hover:text-ink">Dismiss</button>
              </div>
            </div>
          ))}
        </Card>

        <Card className="overflow-hidden">
          <div className="relative h-[180px] bg-map-sea">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full">
              <path d="M8 0 C 20 30, 10 55, 28 70 S 30 95, 36 100" fill="none" stroke="var(--c-accent-decor)" strokeOpacity=".35" strokeWidth="3" />
            </svg>
            {mapStops.map((e, i) => {
              const p = bookingPos[e.booking.id]
              return (
                <span key={e.key} className="absolute grid size-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-primary text-[11px] font-bold text-white ring-2 ring-white dark:text-on-primary" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
                  {i + 1}
                </span>
              )
            })}
          </div>
          <ol className="flex flex-col gap-1.5 p-4 text-[13px] font-semibold text-ink">
            {mapStops.map((e, i) => (
              <li key={e.key} className="flex items-center gap-2">
                <span className="grid size-5 place-items-center rounded-full bg-primary text-[11px] font-bold text-white dark:text-on-primary">{i + 1}</span>
                {e.booking.title.replace('Dinner · ', '')}
              </li>
            ))}
          </ol>
          <Link to={`/trips/${trip.id}/plan`} className="block border-t border-line px-4 py-3 text-[13px] font-bold text-link">Open day plan →</Link>
        </Card>
      </div>
    </div>
  )
}
