import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { ChevronLeft, ChevronRight, Clock, Copy, Navigation, Phone, Plane, Sun, Ticket, X } from 'lucide-react'
import type { Booking } from '../data/types'
import { user } from '../data/demo'
import { bookingById, bookingsFor, completedTrips, daysUntil, fmtDay, fmtRange, fmtTime, fmtWeekday, nights, upcomingTrips } from '../lib/trips'
import { Card } from '../components/ui'

type Tab = 'today' | 'upcoming' | 'used'
const isPass = (b: Booking) => b.type !== 'restaurant'

const band = (b: Booking) =>
  b.type === 'flight' ? { bg: 'bg-[#043263] dark:bg-[#0a2a55]', label: 'Flight' } : b.type === 'hotel' ? { bg: 'bg-[#00839f]', label: 'Hotel' } : b.type === 'train' ? { bg: 'bg-[#1a6fc4]', label: 'Train' } : { bg: 'bg-[#d5603f]', label: 'Ticket' }

const route = (b: Booking) => b.title.split('· ')[1] ?? b.title

export function Wallet() {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'upcoming'
  const [qr, setQr] = useState<Booking | null>(null)
  const passes = upcomingTrips().flatMap((t) => bookingsFor(t.id).filter(isPass))
  const used = completedTrips().flatMap((t) => bookingsFor(t.id).filter(isPass))
  const nextFlight = passes.find((b) => b.type === 'flight')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: 'upcoming', label: `Upcoming · ${passes.length}` },
    { id: 'used', label: 'Used' },
  ]

  return (
    <div className="mx-auto flex max-w-[1120px] flex-col gap-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[32px] font-extrabold tracking-tight text-ink">Wallet</h1>
          <p className="mt-1 text-[15px] text-muted">Tickets and passes from your bookings · all available offline</p>
        </div>
        <div className="flex rounded-xl border border-line bg-surface p-1">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setParams(t.id === 'upcoming' ? {} : { tab: t.id })} className={`rounded-lg px-4 py-2 text-sm font-bold ${tab === t.id ? 'bg-tint text-ink' : 'text-muted hover:text-ink'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'today' && <TravelDay onQr={setQr} />}

      {tab === 'upcoming' && (
        <>
          <Card className="flex items-center gap-3 bg-success/5 px-5 py-3 text-sm font-semibold text-success">✓ All {passes.length} passes available offline</Card>
          {nextFlight && (
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-extrabold text-ink">Next up</h2>
              <BigFlight b={nextFlight} />
            </section>
          )}
          {upcomingTrips().map((t) => {
            const items = bookingsFor(t.id).filter(isPass)
            if (!items.length) return null
            return (
              <section key={t.id} className="flex flex-col gap-3">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-lg font-extrabold text-ink">
                    {t.city}, {t.country} <span className="ml-1 text-sm font-semibold text-muted">{fmtRange(t)} · in {daysUntil(t.start)} days</span>
                  </h2>
                  <Link to={`/trips/${t.id}/plan`} className="text-sm font-bold text-link">Open planner →</Link>
                </div>
                <div className="grid grid-cols-3 gap-5">
                  {items.map((b) => <PassCard key={b.id} b={b} onQr={setQr} />)}
                </div>
              </section>
            )
          })}
        </>
      )}

      {tab === 'used' &&
        completedTrips().map((t) => (
          <section key={t.id} className="flex flex-col gap-3">
            <h2 className="text-lg font-extrabold text-ink">
              {t.city}, {t.country} <span className="ml-1 text-sm font-semibold text-muted">{fmtRange(t)} · completed</span>
            </h2>
            <div className="grid grid-cols-3 gap-5">
              {used.filter((b) => b.tripId === t.id).map((b) => <PassCard key={b.id} b={b} used onQr={setQr} />)}
            </div>
          </section>
        ))}

      {qr && <QrView b={qr} onClose={() => setQr(null)} />}
    </div>
  )
}

/** Ticket shell: coloured band, notches and a dashed tear line between top and bottom. */
function Shell({ b, right, top, bottom, used, className = '' }: { b: Booking; right?: React.ReactNode; top: React.ReactNode; bottom: React.ReactNode; used?: boolean; className?: string }) {
  const c = band(b)
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-line bg-surface ${used ? 'opacity-60 grayscale' : ''} ${className}`}>
      <div className={`flex items-center justify-between px-5 py-2.5 text-xs font-extrabold tracking-wider text-white ${c.bg}`}>
        <span>{b.provider}</span>
        {right ?? <span>{c.label.toUpperCase()}</span>}
      </div>
      <div className="px-5 pb-4 pt-4">{top}</div>
      <div className="relative">
        <span className="absolute -left-2.5 -top-2.5 size-5 rounded-full border border-line bg-bg" />
        <span className="absolute -right-2.5 -top-2.5 size-5 rounded-full border border-line bg-bg" />
        <div className="mx-5 border-t border-dashed border-line" />
      </div>
      <div className="px-5 pb-4 pt-4">{bottom}</div>
      {used && <span className="absolute right-4 top-14 -rotate-12 rounded-md border-2 border-muted px-2 py-0.5 text-sm font-extrabold tracking-widest text-muted">USED</span>}
    </div>
  )
}

const F = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-[10px] font-bold tracking-wider text-muted">{label}</p>
    <p className="text-sm font-bold text-ink">{value}</p>
  </div>
)

function PassCard({ b, onQr, used }: { b: Booking; onQr: (b: Booking) => void; used?: boolean }) {
  const isHotel = b.type === 'hotel'
  const title = b.type === 'flight' || b.type === 'train' ? route(b) : b.title
  const sub = isHotel ? `${Math.round((new Date(b.end!.slice(0, 10)).getTime() - new Date(b.start.slice(0, 10)).getTime()) / 86400000)} nights · ${b.guests} guests` : b.type === 'flight' ? b.location : `${b.guests} adults`
  return (
    <Shell
      b={b}
      used={used}
      top={
        <>
          <p className="text-xl font-extrabold leading-tight text-ink">{title}</p>
          <p className="mt-0.5 truncate text-xs text-muted">{sub}</p>
        </>
      }
      bottom={
        <div className="flex items-start gap-3">
          <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-2">
            <F label={isHotel ? 'CHECK-IN' : 'DATE'} value={`${fmtWeekday(b.start)} ${fmtDay(b.start)}`} />
            <F label="TIME" value={fmtTime(b.start)} />
            <div className="col-span-2"><F label="CONFIRMATION" value={b.ref} /></div>
            {b.type === 'flight' && !used && (
              <span className="col-span-2 flex items-center gap-1.5 rounded-lg bg-tint px-2.5 py-1.5 text-xs font-bold text-muted"><Clock size={13} /> Check-in opens {fmtDay(b.checkInOpens!)}</span>
            )}
            {isHotel && (
              <div className="col-span-2 flex items-center justify-between gap-2">
                <span className="truncate text-xs text-muted">{b.location.split(',')[0]}</span>
                <button className="flex items-center gap-1 rounded-lg border border-line px-2.5 py-1 text-xs font-bold text-ink hover:bg-tint"><Navigation size={12} /> Directions</button>
              </div>
            )}
          </div>
          {b.hasPass && !used && (
            <button onClick={() => onQr(b)} aria-label="Show QR code" className="rounded-lg border border-line bg-white p-1.5 hover:shadow-pop">
              <QRCodeSVG value={`WAYPAD|${b.ref}`} size={64} fgColor="#043263" />
            </button>
          )}
        </div>
      }
    />
  )
}

function BigFlight({ b }: { b: Booking }) {
  const [from, to] = route(b).split(' → ')
  return (
    <Shell
      b={b}
      right={<span>FLIGHT · IN {daysUntil(b.start)} DAYS</span>}
      top={
        <div className="flex items-center gap-6">
          <div>
            <p className="text-5xl font-extrabold text-ink">{from}</p>
            <p className="text-sm font-semibold text-muted">{fmtTime(b.start)} · {b.location.split(' → ')[0]}</p>
          </div>
          <div className="relative flex-1 border-t-2 border-dashed border-line">
            <Plane size={20} className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 bg-surface text-primary" />
          </div>
          <div className="text-right">
            <p className="text-5xl font-extrabold text-ink">{to}</p>
            <p className="text-sm font-semibold text-muted">{fmtTime(b.end!)} · {b.location.split(' → ')[1]}</p>
          </div>
        </div>
      }
      bottom={
        <div className="flex items-center gap-10">
          <F label="DATE" value={`${fmtWeekday(b.start)} ${fmtDay(b.start)}`} />
          <F label="DEPARTS" value={fmtTime(b.start)} />
          <F label="CONFIRMATION" value={b.ref} />
          <span className="ml-auto flex items-center gap-1.5 rounded-full bg-tint px-3 py-1.5 text-xs font-bold text-muted"><Clock size={13} /> Check-in opens {fmtDay(b.checkInOpens!)} · Boarding pass will appear here</span>
        </div>
      }
    />
  )
}

/** Travel-day view: what the Wallet looks like on 12 Nov, after online check-in. */
function TravelDay({ onQr }: { onQr: (b: Booking) => void }) {
  const flight = bookingById('rome-flight-out')!
  const hotel = bookingById('rome-hotel')!
  const boarding: Booking = { ...flight, hasPass: true }
  const [from, to] = route(flight).split(' → ')
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-xl bg-tint/60 px-5 py-3 text-sm text-ink">
        <Sun size={16} className="text-highlight" />
        <b>Today · Thu 12 Nov · Rome trip, Day 1</b>
        <span className="text-muted">Preview of your travel day — check-in is done and your boarding pass has arrived.</span>
      </div>

      <div className="grid grid-cols-[56px_24px_minmax(0,820px)] gap-x-3 gap-y-3">
        <span className="pt-2 text-sm font-bold text-ink">08:40</span>
        <span className="relative mt-3 size-3.5 justify-self-center rounded-full bg-primary after:absolute after:left-1/2 after:top-5 after:h-[420px] after:w-0.5 after:-translate-x-1/2 after:bg-line" />
        <Shell
          b={flight}
          
          right={
            <span className="flex gap-2">
              <span className="rounded-full bg-highlight px-2.5 py-0.5 text-[11px] text-white">Boarding in 45 min</span>
              <span className="rounded-full bg-success px-2.5 py-0.5 text-[11px] text-white">✓ Checked in</span>
            </span>
          }
          top={
            <div className="flex items-center gap-6">
              <div>
                <p className="text-5xl font-extrabold text-ink">{from}</p>
                <p className="text-sm font-semibold text-muted">Amsterdam · {fmtTime(flight.start)}</p>
              </div>
              <div className="relative flex-1 border-t-2 border-dashed border-line">
                <Plane size={20} className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 bg-surface text-primary" />
              </div>
              <div className="text-right">
                <p className="text-5xl font-extrabold text-ink">{to}</p>
                <p className="text-sm font-semibold text-muted">Rome · {fmtTime(flight.end!)}</p>
              </div>
            </div>
          }
          bottom={
            <div className="flex items-center gap-6">
              <div className="grid flex-1 grid-cols-3 gap-y-3">
                <F label="PASSENGER" value={user.fullName} />
                <F label="FLIGHT" value="KL 1597" />
                <F label="SEAT" value="14C" />
                <F label="GATE" value="D7" />
                <F label="BOARDING" value="08:00" />
                <F label="GROUP" value="3" />
              </div>
              <div className="flex flex-col items-center gap-1 border-l border-dashed border-line pl-6">
                <button onClick={() => onQr(boarding)} aria-label="Enlarge boarding pass QR" className="rounded-lg border border-line bg-white p-2 hover:shadow-pop">
                  <QRCodeSVG value={`WAYPAD|BOARDING|${flight.ref}|KL1597|14C`} size={140} fgColor="#043263" />
                </button>
                <span className="text-xs font-semibold text-muted">Scan at gate · Tap to enlarge</span>
              </div>
            </div>
          }
        />
        <span />
        <span />
        <p className="flex items-center gap-2 text-[13px] font-semibold text-muted">
          <Plane size={13} /> Arrive Rome {fmtTime(flight.end!)} · Hotel check-in from {fmtTime(hotel.start)} ·{' '}
          <Link to="/trips/rome/plan?day=1" className="font-bold text-link">Plan your free time ›</Link>
        </p>

        <span className="pt-2 text-sm font-bold text-ink">15:00</span>
        <span className="relative z-10 mt-3 size-3.5 justify-self-center rounded-full bg-[#00839f]" />
        <Shell
          b={hotel}
          
          right={<span>BOOKING.COM · HOTEL</span>}
          top={
            <>
              <p className="text-2xl font-extrabold text-ink">{hotel.title}</p>
              <p className="text-sm text-muted">{hotel.location}</p>
            </>
          }
          bottom={
            <div className="flex items-center gap-8">
              <F label="CHECK-IN" value={fmtTime(hotel.start)} />
              <F label="NIGHTS" value={String(nights({ start: hotel.start.slice(0, 10), end: hotel.end!.slice(0, 10) } as never))} />
              <F label="CONFIRMATION" value={hotel.ref} />
              <span className="ml-auto flex gap-2">
                <button className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-[13px] font-bold text-ink hover:bg-tint"><Navigation size={14} /> Directions</button>
                <button className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-[13px] font-bold text-ink hover:bg-tint"><Phone size={14} /> Call hotel</button>
              </span>
            </div>
          }
        />
      </div>
    </div>
  )
}

function QrView({ b, onClose }: { b: Booking; onClose: () => void }) {
  const count = b.type === 'flight' ? 1 : Math.max(1, b.guests ?? 1)
  const [i, setI] = useState(0)
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const ref = count > 1 ? `${b.ref}-A${i + 1}` : b.ref
  const info = b.type === 'flight' ? 'SEAT 14C · GATE D7 · GROUP 3' : `${fmtWeekday(b.start)} ${fmtDay(b.start)} · ${fmtTime(b.start)} · ${b.guests ?? 1} adults`

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-6" onClick={onClose}>
      <div className="flex w-[420px] flex-col items-center gap-4 rounded-3xl bg-white p-7 text-[#043263]" onClick={(e) => e.stopPropagation()}>
        <div className="flex w-full items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-[#dbe5ff]">{b.type === 'flight' ? <Plane size={17} /> : <Ticket size={17} />}</span>
          <p className="flex-1 font-extrabold">{b.title}</p>
          <button onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>
        <div className="rounded-2xl border border-[#d5dded] p-5">
          <QRCodeSVG value={`WAYPAD|${ref}|${b.start}`} size={280} fgColor="#043263" />
        </div>
        {count > 1 && (
          <div className="flex items-center gap-4 text-sm font-bold">
            <button aria-label="Previous pass" disabled={i === 0} onClick={() => setI(i - 1)} className="grid size-8 place-items-center rounded-lg border border-[#d5dded] disabled:opacity-30"><ChevronLeft size={16} /></button>
            {i + 1} / {count}
            <button aria-label="Next pass" disabled={i === count - 1} onClick={() => setI(i + 1)} className="grid size-8 place-items-center rounded-lg border border-[#d5dded] disabled:opacity-30"><ChevronRight size={16} /></button>
          </div>
        )}
        <p className="text-lg font-extrabold">{info}</p>
        <button onClick={() => { navigator.clipboard?.writeText(ref); setCopied(true) }} className="flex items-center gap-2 rounded-lg bg-[#f6f8fd] px-4 py-1.5 font-bold">
          {ref} <Copy size={14} /> {copied && <span className="text-xs text-[#23784a]">Copied</span>}
        </button>
        <p className="text-xs font-semibold text-[#5a6b85]">☀ Screen brightness increased for scanning</p>
      </div>
    </div>
  )
}
