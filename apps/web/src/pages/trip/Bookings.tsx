import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import {
  Ban, CalendarPlus, Clock, Copy, ExternalLink, Eye, FileText, MapPin, MoreHorizontal, Paperclip, Pencil, Plane, Plus, QrCode,
  Radio, Share2, Trash2, TriangleAlert, X, ArrowLeftRight, Navigation, Phone,
} from 'lucide-react'
import type { Booking, Trip } from '../../data/types'
import { user } from '../../data/demo'
import { bookingsFor, fmtDay, fmtDayLong, fmtTime, missingNights, nights, tripDays, tripTotal } from '../../lib/trips'
import { Card, typeIcon } from '../../components/ui'

const groups = [
  { label: 'Transport', types: ['flight', 'train'] },
  { label: 'Stays', types: ['hotel'] },
  { label: 'Activities & tickets', types: ['museum', 'restaurant', 'tour'] },
] as const

export function Bookings({ trip }: { trip: Trip }) {
  const [params, setParams] = useSearchParams()
  const [cancelled, setCancelled] = useState<Set<string>>(new Set())
  const [menu, setMenu] = useState<string | null>(null)
  const [groupBy, setGroupBy] = useState<'type' | 'date'>('type')
  const bs = bookingsFor(trip.id)
  const open = bs.find((b) => b.id === params.get('open'))
  const ticket = bs.find((b) => b.id === params.get('ticket'))
  const close = () => setParams({})

  const list = (items: Booking[]) =>
    items.map((b) => (
      <BookingCard
        key={b.id}
        b={b}
        cancelled={cancelled.has(b.id)}
        selected={open?.id === b.id}
        menuOpen={menu === b.id}
        onMenu={() => setMenu(menu === b.id ? null : b.id)}
        onOpen={() => { setMenu(null); setParams({ open: b.id }) }}
        onTicket={() => setParams({ ticket: b.id })}
        onCancel={() => { setCancelled(new Set([...cancelled, b.id])); setMenu(null) }}
      />
    ))

  return (
    <div className={`grid gap-6 ${open ? 'grid-cols-[minmax(0,1fr)_400px]' : 'grid-cols-1'}`}>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-extrabold text-ink">
            {bs.length} bookings <span className="text-base font-semibold text-muted">· €{tripTotal(trip.id).toLocaleString('en')} total</span>
          </h2>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2 text-[13px] text-muted">
              Forward to <b className="text-ink">{user.forwardAddress}</b>
              <button onClick={() => navigator.clipboard?.writeText(user.forwardAddress)} aria-label="Copy"><Copy size={14} /></button>
            </span>
            <button className="flex items-center gap-2 rounded-xl bg-highlight px-4 py-2.5 text-sm font-bold text-white"><Plus size={16} /> Add booking</button>
          </div>
        </div>

        <Coverage trip={trip} />

        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-ink">All bookings</h3>
          <div className="flex items-center gap-2 text-[13px] font-semibold text-muted">
            Group by
            <div className="flex rounded-lg border border-line p-0.5">
              {(['type', 'date'] as const).map((g) => (
                <button key={g} onClick={() => setGroupBy(g)} className={`rounded-md px-3 py-1 font-bold capitalize ${groupBy === g ? 'bg-tint text-ink' : 'text-muted'}`}>{g}</button>
              ))}
            </div>
          </div>
        </div>

        {groupBy === 'type'
          ? groups.map((g) => {
              const items = bs.filter((b) => (g.types as readonly string[]).includes(b.type))
              if (!items.length) return null
              return (
                <section key={g.label} className="flex flex-col gap-3">
                  <h4 className="text-sm font-bold text-muted">{g.label} ({items.length})</h4>
                  {list(items)}
                </section>
              )
            })
          : tripDays(trip).map((day) => {
              const items = bs.filter((b) => b.start.slice(0, 10) === day)
              if (!items.length) return null
              return (
                <section key={day} className="flex flex-col gap-3">
                  <h4 className="text-sm font-bold text-muted">{fmtDayLong(day)}</h4>
                  {list(items)}
                </section>
              )
            })}
      </div>

      {open && <Drawer b={open} onClose={close} />}
      {ticket && <TicketModal b={ticket} onClose={close} />}
    </div>
  )
}

function Coverage({ trip }: { trip: Trip }) {
  const days = tripDays(trip)
  const bs = bookingsFor(trip.id)
  const missing = missingNights(trip)
  const n = nights(trip)
  const col = (iso: string) => days.indexOf(iso.slice(0, 10))
  const flights = bs.filter((b) => b.type === 'flight')
  const hotels = bs.filter((b) => b.type === 'hotel')

  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold text-ink">Trip coverage</h3>
          <p className="text-[13px] text-muted">Transport and stays from arrival to departure</p>
        </div>
        <span className={`text-[13px] font-bold ${missing.length ? 'text-highlight' : 'text-success'}`}>{n - missing.length} of {n} nights covered</span>
      </div>

      <div className="grid gap-y-3" style={{ gridTemplateColumns: `100px repeat(${days.length}, minmax(0,1fr))` }}>
        <span />
        {days.map((d) => (
          <span key={d} className="text-center text-xs font-bold uppercase text-muted">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(d + 'T12:00').getDay()]} <b className="text-sm text-ink">{Number(d.slice(8))}</b>
          </span>
        ))}

        <span className="self-center text-xs font-bold tracking-wider text-muted">TRANSPORT</span>
        <div className="relative h-11 rounded-lg bg-bg" style={{ gridColumn: `2 / span ${days.length}` }}>
          <div className="absolute inset-x-6 top-1/2 border-t border-dashed border-line" />
          {flights.map((f) => {
            const c = col(f.start)
            const left = ((c + 0.5) / days.length) * 100
            return (
              <span key={f.id} className={`absolute top-1/2 flex -translate-y-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-surface py-1 pl-1 pr-3 shadow-sm ${c === days.length - 1 ? '-translate-x-full' : c === 0 ? '' : '-translate-x-1/2'}`} style={{ left: `${c === days.length - 1 ? 99 : c === 0 ? 1 : left}%` }}>
                <span className="grid size-7 place-items-center rounded-full bg-primary text-white dark:text-on-primary"><Plane size={13} /></span>
                <span className="text-xs font-bold leading-tight text-ink">{fmtTime(f.start)}<span className="block font-semibold text-muted">{f.title.split('· ')[1]}</span></span>
              </span>
            )
          })}
        </div>

        <span className="self-center text-xs font-bold tracking-wider text-muted">STAYS</span>
        <div className="relative grid h-11" style={{ gridColumn: `2 / span ${days.length}`, gridTemplateColumns: `repeat(${days.length * 2}, minmax(0,1fr))` }}>
          {hotels.map((h) => {
            const a = col(h.start)
            const len = Math.round((new Date(h.end!.slice(0, 10)).getTime() - new Date(h.start.slice(0, 10)).getTime()) / 86400000)
            return (
              <span key={h.id} className="flex items-center truncate rounded-lg bg-primary px-3 text-[13px] font-bold text-white dark:text-on-primary" style={{ gridColumn: `${a * 2 + 2} / span ${len * 2}` }}>
                {h.title} <span className="ml-1 font-semibold opacity-70">· {len} nights</span>
              </span>
            )
          })}
          {missing.map((m) => (
            <Link key={m} to="/suggestions" className="ml-1 flex items-center justify-center rounded-lg border-2 border-dashed border-highlight bg-highlight-soft text-[13px] font-bold text-highlight" style={{ gridColumn: `${col(m) * 2 + 2} / span 2` }}>
              No stay · Add ›
            </Link>
          ))}
        </div>
      </div>

      {missing.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl bg-highlight-soft px-4 py-3 text-sm text-on-highlight-soft">
          <TriangleAlert size={18} />
          <span className="flex-1"><b>Night of {fmtDay(missing[0])} has no stay.</b> Check-out is {fmtDay(missing[0])} 11:00, your flight home leaves the next day.</span>
          <Link to="/suggestions" className="font-extrabold">Find a hotel</Link>
        </div>
      )}
    </Card>
  )
}

interface CardProps {
  b: Booking
  cancelled: boolean
  selected: boolean
  menuOpen: boolean
  onMenu: () => void
  onOpen: () => void
  onTicket: () => void
  onCancel: () => void
}

function BookingCard({ b, cancelled, selected, menuOpen, onMenu, onOpen, onTicket, onCancel }: CardProps) {
  const Icon = typeIcon[b.type]
  const when = b.type === 'hotel' ? `${fmtDay(b.start)}–${fmtDay(b.end!)} · ${Math.round((new Date(b.end!.slice(0, 10)).getTime() - new Date(b.start.slice(0, 10)).getTime()) / 86400000)} nights` : `${fmtDayLong(b.start)} · ${fmtTime(b.start)}${b.end ? ` → ${fmtTime(b.end)}` : ''}`
  const source = b.source === 'Manual' ? 'Added manually' : b.source === 'PDF' ? `${b.provider} · Uploaded PDF` : b.source === 'Booking.com' ? 'Imported from Booking.com' : `${b.provider} · Imported from email`

  const menuGroups: { label: string; icon: typeof Eye; danger?: boolean; action?: () => void }[][] = [
    [{ label: 'View details', icon: Eye, action: onOpen }, { label: 'Edit', icon: Pencil }, { label: 'View original email', icon: FileText }],
    b.type === 'flight'
      ? [{ label: 'Check in online', icon: ExternalLink }, { label: 'Flight status', icon: Radio }]
      : b.type === 'hotel'
        ? [{ label: 'Get directions', icon: Navigation }, { label: 'Contact property', icon: Phone }]
        : [{ label: 'Get directions', icon: Navigation }],
    [{ label: 'Add to calendar', icon: CalendarPlus }, { label: 'Share', icon: Share2 }, { label: 'Move to another trip', icon: ArrowLeftRight }],
    [{ label: 'Mark as cancelled', icon: Ban, action: onCancel }, { label: 'Delete', icon: Trash2, danger: true }],
  ]

  return (
    <div className={`relative flex items-center gap-4 rounded-2xl border bg-surface p-4 transition-shadow hover:shadow-card ${selected ? 'border-link ring-1 ring-link' : 'border-line'} ${cancelled ? 'opacity-55' : ''}`}>
      <button onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-4 text-left">
        <span className="grid size-11 flex-none place-items-center rounded-xl bg-tint text-primary"><Icon size={20} /></span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold text-ink">{b.title}</span>
          <span className="block text-sm text-ink">{when}</span>
          <span className="block text-xs text-muted">{source}</span>
          <span className="mt-1.5 flex gap-2">
            {cancelled ? (
              <span className="rounded-full bg-tint px-2.5 py-0.5 text-xs font-bold text-muted">Cancelled</span>
            ) : (
              <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-bold text-success">Confirmed</span>
            )}
            {b.freeCancellationUntil && !cancelled && <span className="rounded-full bg-highlight-soft px-2.5 py-0.5 text-xs font-bold text-highlight">Free cancellation until {fmtDay(b.freeCancellationUntil)}</span>}
          </span>
        </span>
      </button>

      <span className="w-28 text-[13px]">
        <span className={`block text-base font-extrabold text-ink ${cancelled ? 'line-through' : ''}`}>{b.price ? `€${b.price}` : '—'}</span>
        <span className={b.paid ? 'font-semibold text-success' : 'text-muted'}>{b.price ? (b.paid ? 'Paid' : 'Pay at property') : 'No prepayment'}</span>
        <span className="flex items-center gap-1 font-bold text-ink">{b.ref}<button aria-label="Copy confirmation code" onClick={() => navigator.clipboard?.writeText(b.ref)} className="text-muted"><Copy size={12} /></button></span>
      </span>

      <span className="w-40 text-right">
        {b.hasPass ? (
          <button onClick={onTicket} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[13px] font-bold text-white dark:text-on-primary"><QrCode size={14} /> Show ticket</button>
        ) : b.checkInOpens ? (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[13px] font-bold text-muted"><Clock size={14} /> Check-in {fmtDay(b.checkInOpens)}</span>
        ) : null}
      </span>

      <button aria-label="Original PDF" className="text-muted hover:text-ink"><Paperclip size={17} /></button>
      <button aria-label="More" onClick={onMenu} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-tint hover:text-ink"><MoreHorizontal size={18} /></button>

      {menuOpen && (
        <div className="absolute right-4 top-14 z-30 w-56 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-card">
          {menuGroups.map((g, i) => (
            <div key={i} className={i ? 'border-t border-line pt-1' : ''}>
              {g.map((m) => (
                <button key={m.label} onClick={m.action} className={`flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm font-semibold hover:bg-tint ${m.danger ? 'text-error' : 'text-ink'}`}>
                  <m.icon size={15} /> {m.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Drawer({ b, onClose }: { b: Booking; onClose: () => void }) {
  const Icon = typeIcon[b.type]
  const isHotel = b.type === 'hotel'
  return (
    <aside className="sticky top-[100px] flex max-h-[calc(100vh-120px)] flex-col gap-5 overflow-y-auto rounded-2xl border border-line bg-surface p-6">
      <div className="flex items-start gap-3">
        <span className="grid size-11 flex-none place-items-center rounded-xl bg-tint text-primary"><Icon size={20} /></span>
        <div className="flex-1">
          <h3 className="text-lg font-extrabold text-ink">{b.title}</h3>
          <p className="text-[13px] text-muted">{b.source === 'Manual' ? 'Added manually' : b.source === 'Booking.com' ? 'Imported from Booking.com' : `${b.provider} · Imported from ${b.source === 'PDF' ? 'PDF' : 'email'}`}</p>
        </div>
        <button onClick={onClose} aria-label="Close" className="text-muted hover:text-ink"><X size={18} /></button>
      </div>

      <div className="grid grid-cols-2 gap-4 text-[13px]">
        <Field label={isHotel ? 'Check-in' : 'Date'} value={`${fmtDayLong(b.start)} · ${isHotel ? 'from ' : ''}${fmtTime(b.start)}`} />
        <Field label="Guests" value={`${b.guests ?? 1} adults`} />
        {isHotel && (
          <div className="col-span-2 rounded-xl border border-[#f2c94c] bg-[#fff8e1] p-3 text-[#6b5200] dark:bg-[#3a3214] dark:text-[#f2d98a]">
            <p className="flex items-center gap-1.5 text-xs font-bold"><TriangleAlert size={13} /> Please check: check-out date</p>
            <p className="mt-1 font-bold">Check-out {fmtDayLong(b.end!)} · until {fmtTime(b.end!)}</p>
            <p className="mt-0.5 text-xs">Your flight home is the day after. The email may list the wrong date.</p>
          </div>
        )}
        <Field label="Price" value={b.price ? `€${b.price} · ${b.paid ? 'Paid' : 'Pay at property'}` : 'No prepayment'} />
        <Field label="Confirmation" value={b.ref} />
      </div>

      <div>
        <p className="mb-1.5 text-xs font-bold tracking-wider text-muted">ADDRESS</p>
        <p className="text-sm font-bold text-ink">{b.location}</p>
        <div className="relative mt-2 h-28 overflow-hidden rounded-xl bg-map-land">
          <MapPin size={26} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full text-link" />
        </div>
        <button className="mt-2 text-[13px] font-bold text-link">Get directions</button>
      </div>

      {b.freeCancellationUntil && (
        <div>
          <p className="mb-1.5 text-xs font-bold tracking-wider text-muted">CANCELLATION POLICY</p>
          <p className="text-sm text-ink">Free cancellation until <b>{fmtDay(b.freeCancellationUntil)}, 23:59</b>. After that, the first night is charged.</p>
        </div>
      )}

      <div>
        <p className="mb-1.5 text-xs font-bold tracking-wider text-muted">NOTES</p>
        <textarea className="h-20 w-full resize-none rounded-xl border border-line bg-bg p-3 text-sm text-ink outline-none focus:border-link" placeholder="Add a note, e.g. late arrival or room request…" />
      </div>

      {b.source !== 'Manual' && (
        <div>
          <p className="mb-1.5 text-xs font-bold tracking-wider text-muted">ORIGINAL {b.source === 'PDF' ? 'PDF' : 'EMAIL'}</p>
          <div className="rounded-xl border border-line bg-bg p-3 text-[13px] text-muted">
            <p>From <b className="text-ink">{b.provider}</b></p>
            <p className="font-bold text-ink">Your booking is confirmed: {b.title}</p>
            <p className="mt-1">Confirmation: <b className="text-ink">{b.ref}</b></p>
          </div>
        </div>
      )}

      <div className="mt-auto flex gap-3">
        <button className="flex-1 rounded-xl border border-line py-2.5 font-bold text-ink hover:bg-tint">Edit booking</button>
        <button className="rounded-xl px-4 py-2.5 font-bold text-error hover:bg-error/10">Remove</button>
      </div>
    </aside>
  )
}

const Field = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-xs text-muted">{label}</p>
    <p className="font-bold text-ink">{value}</p>
  </div>
)

export function TicketModal({ b, onClose }: { b: Booking; onClose: () => void }) {
  const Icon = typeIcon[b.type]
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-6" onClick={onClose} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="flex w-[400px] flex-col items-center gap-4 rounded-2xl bg-surface p-7 shadow-card" onClick={(e) => e.stopPropagation()}>
        <div className="flex w-full items-start gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-tint text-primary"><Icon size={18} /></span>
          <div className="flex-1">
            <p className="font-extrabold text-ink">{b.title}</p>
            <p className="text-[13px] text-muted">{fmtDayLong(b.start)} · {fmtTime(b.start)} · {b.location.split(',')[0]}</p>
          </div>
          <button onClick={onClose} aria-label="Close (Esc)" className="text-muted hover:text-ink"><X size={18} /></button>
        </div>
        <div className="rounded-2xl border border-line bg-white p-5">
          <QRCodeSVG value={`WAYPAD|${b.ref}|${b.title}|${b.start}`} size={220} fgColor="#043263" />
        </div>
        <span className="flex items-center gap-2 rounded-lg bg-tint px-4 py-1.5 font-extrabold text-ink">
          {b.ref}
          <button aria-label="Copy confirmation code" onClick={() => navigator.clipboard?.writeText(b.ref)} className="text-muted"><Copy size={14} /></button>
        </span>
        <p className="text-sm text-muted">{b.guests ?? 1} adults · Standard entry</p>
        <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-bold text-success">✓ Available offline</span>
        <div className="flex w-full gap-3">
          <button className="flex-1 rounded-xl bg-black py-3 text-sm font-bold text-white">Add to Apple Wallet</button>
          <button className="flex-1 rounded-xl border border-line py-3 text-sm font-bold text-ink hover:bg-tint">Download PDF</button>
        </div>
      </div>
    </div>
  )
}
