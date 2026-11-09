import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, BedDouble, Check, CheckCircle2, Copy, FileText, Mail, PencilLine, Plane, TrainFront, Ticket, TriangleAlert, UploadCloud, Utensils, X } from 'lucide-react'
import type { Booking, BookingType } from '../data/types'
import { user } from '../data/demo'
import { addBooking } from '../lib/store'
import { fmtDay, fmtRange, gaps, nights, readiness, tripById, upcomingTrips } from '../lib/trips'

/* ---------- context: any "Add booking" button opens the same flow ---------- */
const Ctx = createContext<(tripId?: string) => void>(() => {})
export const useAddBooking = () => useContext(Ctx)

export function AddBookingProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<{ tripId?: string } | null>(null)
  return (
    <Ctx.Provider value={(tripId) => setOpen({ tripId })}>
      {children}
      {open && <AddBookingModal tripId={open.tripId} onClose={() => setOpen(null)} />}
    </Ctx.Provider>
  )
}

/* ---------- the extraction the demo "reads" from an uploaded file ---------- */
type Conf = 'High' | 'Medium' | 'Check'
interface Draft {
  type: BookingType
  provider: string
  title: string
  ref: string
  start: string // yyyy-mm-ddThh:mm
  end: string
  location: string
  guests: string
  price: string
  conf: Record<string, Conf>
  file?: string
  checkOutOptions?: string[]
}

const extracted = (file: string): Draft => ({
  type: 'hotel',
  provider: 'Booking.com',
  title: 'Hotel Quirinale',
  ref: 'BK 5530-117',
  start: '2026-11-15T15:00',
  end: '',
  location: 'Via Nazionale 7, 00184 Roma',
  guests: '2',
  price: '145',
  conf: { provider: 'High', ref: 'High', start: 'High', end: 'Check', location: 'Medium', guests: 'High', price: 'High', title: 'High' },
  file,
  checkOutOptions: ['2026-11-16T11:00', '2026-11-16T12:00'],
})

const blank = (): Draft => ({ type: 'museum', provider: '', title: '', ref: '', start: '', end: '', location: '', guests: '2', price: '', conf: {} })

const types: { id: BookingType; label: string; icon: typeof Plane }[] = [
  { id: 'flight', label: 'Flight', icon: Plane },
  { id: 'hotel', label: 'Hotel', icon: BedDouble },
  { id: 'train', label: 'Train / Bus', icon: TrainFront },
  { id: 'museum', label: 'Ticket', icon: Ticket },
  { id: 'restaurant', label: 'Restaurant', icon: Utensils },
]

const suggestTrip = (iso: string) => upcomingTrips().find((t) => iso && iso.slice(0, 10) >= t.start && iso.slice(0, 10) <= t.end)?.id ?? 'unsorted'

/* ---------- modal ---------- */
function AddBookingModal({ tripId, onClose }: { tripId?: string; onClose: () => void }) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [reading, setReading] = useState<{ name: string; pct: number } | null>(null)
  const [trip, setTrip] = useState<string>(tripId ?? 'rome')
  const [saved, setSaved] = useState<Booking | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])

  const startReading = (name: string) => {
    setReading({ name, pct: 5 })
    let pct = 5
    const t = window.setInterval(() => {
      pct += 19
      if (pct >= 100) {
        window.clearInterval(t)
        const dft = extracted(name)
        setDraft(dft)
        setTrip(tripId ?? suggestTrip(dft.start))
        setReading(null)
        setStep(2)
      } else setReading({ name, pct })
    }, 280)
  }

  const save = () => {
    if (!draft) return
    const b: Booking = {
      id: `imp-${Date.now()}`,
      tripId: trip,
      type: draft.type,
      title: draft.title || 'Untitled booking',
      provider: draft.provider || 'Manual',
      source: draft.file ? (draft.provider === 'Booking.com' ? 'Booking.com' : 'PDF') : 'Manual',
      start: draft.start,
      end: draft.end || undefined,
      location: draft.location,
      ref: draft.ref || `MAN-${String(Date.now()).slice(-5)}`,
      price: Number(draft.price) || 0,
      paid: false,
      status: 'confirmed',
      freeCancellationUntil: draft.type === 'hotel' && draft.file ? '2026-11-13' : undefined,
      guests: Number(draft.guests) || 1,
      hasPass: draft.type === 'museum' || draft.type === 'tour',
      addedAt: new Date().toISOString().slice(0, 16),
    }
    addBooking(b)
    setSaved(b)
    setStep(3)
  }

  const steps = ['Import', 'Review', 'Save']
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-6" onMouseDown={onClose}>
      <div className="flex max-h-[94vh] w-full max-w-[1040px] flex-col overflow-hidden rounded-t-2xl bg-surface shadow-card sm:rounded-2xl" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-label="Add booking">
        <header className="flex items-center gap-4 border-b border-line px-5 py-4 sm:px-6">
          <h2 className="text-lg font-extrabold text-ink">Add booking</h2>
          <ol className="mx-auto hidden items-center gap-3 sm:flex">
            {steps.map((s, i) => (
              <li key={s} className="flex items-center gap-2 text-sm font-bold">
                {i > 0 && <span className={`h-0.5 w-10 ${step > i ? 'bg-primary' : 'bg-line'}`} />}
                <span className={`grid size-6 place-items-center rounded-full text-xs ${step > i + 1 ? 'bg-primary text-white dark:text-on-primary' : step === i + 1 ? 'border-2 border-primary text-primary' : 'border border-line text-muted'}`}>
                  {step > i + 1 ? <Check size={13} /> : i + 1}
                </span>
                <span className={step >= i + 1 ? 'text-ink' : 'text-muted'}>{s}</span>
              </li>
            ))}
          </ol>
          <span className="ml-auto text-xs font-bold text-muted sm:hidden">Step {step} of 3</span>
          <button onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-lg text-muted hover:bg-tint hover:text-ink sm:ml-0">
            <X size={18} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {step === 1 && <ImportStep reading={reading} onFile={startReading} onManual={() => { setDraft(blank()); setTrip(tripId ?? 'unsorted'); setStep(2) }} />}
          {step === 2 && draft && <ReviewStep draft={draft} setDraft={setDraft} trip={trip} setTrip={setTrip} />}
          {step === 3 && saved && <SavedStep b={saved} />}
        </div>

        <footer className="flex flex-wrap items-center gap-3 border-t border-line px-5 py-3 sm:px-6">
          {step === 1 && (
            <>
              <span className="text-xs text-muted">Files are read privately and only used to fill in your trips.</span>
              <button onClick={onClose} className="ml-auto rounded-xl px-4 py-2 text-sm font-bold text-muted hover:text-ink">Cancel</button>
            </>
          )}
          {step === 2 && draft && <ReviewFooter draft={draft} onBack={() => setStep(1)} onSave={save} />}
          {step === 3 && saved && (
            <>
              <button onClick={() => { setDraft(null); setSaved(null); setStep(1) }} className="ml-auto rounded-xl border border-line px-4 py-2.5 text-sm font-bold text-ink hover:bg-tint">Add another</button>
              <button
                onClick={() => { onClose(); navigate(saved.tripId === 'unsorted' ? '/trips?tab=unsorted' : `/trips/${saved.tripId}/bookings`) }}
                className="rounded-xl bg-highlight px-5 py-2.5 text-sm font-bold text-white hover:brightness-110"
              >
                {saved.tripId === 'unsorted' ? 'View unsorted' : 'View trip'}
              </button>
            </>
          )}
        </footer>
      </div>
    </div>
  )
}

/* ---------- step 1 ---------- */
function ImportStep({ reading, onFile, onManual }: { reading: { name: string; pct: number } | null; onFile: (name: string) => void; onManual: () => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const [copied, setCopied] = useState(false)
  const col = 'flex flex-col gap-3 rounded-2xl border border-line p-5'
  return (
    <div className="flex flex-col gap-4 p-5 sm:p-6">
      <p className="text-sm text-muted">Choose how to bring in your booking. Waypad reads the details for you.</p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.3fr_1fr_1fr]">
        <div className={col}>
          <Head icon={FileText} title="Upload PDF" sub="E-tickets, confirmations, invoices" />
          {reading ? (
            <div className="flex flex-1 flex-col justify-center gap-2 rounded-xl bg-tint/50 p-5">
              <p className="truncate text-sm font-bold text-ink">{reading.name}</p>
              <div className="h-2 overflow-hidden rounded-full bg-surface"><div className="h-full rounded-full bg-link transition-all" style={{ width: `${reading.pct}%` }} /></div>
              <p className="text-xs text-muted">Reading… {Math.min(reading.pct, 99)}%</p>
            </div>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); onFile(e.dataTransfer.files[0]?.name ?? 'booking-confirmation.pdf') }}
              className={`flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-5 text-center ${drag ? 'border-link bg-tint/60' : 'border-line'}`}
            >
              <UploadCloud size={26} className="text-link" />
              <p className="text-sm font-bold text-ink">Drag and drop a file</p>
              <p className="text-xs text-muted">PDF, JPG or PNG, up to 10 MB</p>
              <button onClick={() => input.current?.click()} className="mt-1 rounded-xl bg-highlight px-4 py-2 text-sm font-bold text-white hover:brightness-110">Browse files</button>
              <button onClick={() => onFile('Booking.com-confirmation.pdf')} className="text-xs font-bold text-link">or try a sample confirmation</button>
              <input ref={input} type="file" accept=".pdf,.png,.jpg,.jpeg,.eml" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0].name)} />
            </div>
          )}
        </div>
        <div className={col}>
          <Head icon={Mail} title="Forward email" sub="Send confirmations to your address" />
          <p className="text-xs font-bold text-muted">Your Waypad address</p>
          <div className="flex items-center gap-2 rounded-xl border border-line bg-bg px-3 py-2">
            <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink">{user.forwardAddress}</span>
            <button onClick={() => { navigator.clipboard?.writeText(user.forwardAddress); setCopied(true) }} className="flex items-center gap-1 text-xs font-bold text-link"><Copy size={13} /> {copied ? 'Copied' : 'Copy'}</button>
          </div>
          <p className="mt-1 text-xs font-bold text-muted">Or import automatically</p>
          {['Connect Gmail', 'Connect Outlook'].map((l) => (
            <button key={l} disabled className="flex items-center justify-between rounded-xl border border-line px-3 py-2 text-sm font-bold text-muted">{l} <span className="rounded-full bg-tint px-2 text-[10px] text-primary">Soon</span></button>
          ))}
        </div>
        <div className={col}>
          <Head icon={PencilLine} title="Add manually" sub="For bookings without a document" />
          <p className="flex-1 text-sm text-muted">Enter the provider, dates and reference yourself. Good for restaurant tables and tickets bought on site.</p>
          <button onClick={onManual} className="rounded-xl border border-line py-2.5 text-sm font-bold text-ink hover:bg-tint">Start</button>
        </div>
      </div>
    </div>
  )
}

const Head = ({ icon: Icon, title, sub }: { icon: typeof Plane; title: string; sub: string }) => (
  <div className="flex items-center gap-3">
    <span className="grid size-10 place-items-center rounded-xl bg-tint text-primary"><Icon size={18} /></span>
    <span>
      <span className="block font-bold text-ink">{title}</span>
      <span className="block text-xs text-muted">{sub}</span>
    </span>
  </div>
)

/* ---------- step 2 ---------- */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const fieldsFor = (_t: BookingType) => ['title', 'provider', 'ref', 'start', 'end', 'location', 'guests', 'price'] as const

const labels: Record<string, string> = { provider: 'Provider', title: 'Name', ref: 'Confirmation number', start: 'Start / check-in', end: 'End / check-out', location: 'Address or route', guests: 'Guests', price: 'Price (€)' }


function ReviewStep({ draft, setDraft, trip, setTrip }: { draft: Draft; setDraft: (d: Draft) => void; trip: string; setTrip: (t: string) => void }) {
  const set = (k: keyof Draft, v: string) => {
    const conf = { ...draft.conf }
    if (conf[k as string] === 'Check') conf[k as string] = 'High'
    const next = { ...draft, [k]: v, conf }
    setDraft(next)
    if (k === 'start' && !draft.file) setTrip(suggestTrip(v))
  }
  const t = tripById(trip)
  const input = 'w-full rounded-xl border border-line bg-bg px-3 py-2 text-sm font-semibold text-ink outline-none focus:border-link'

  return (
    <div className={`grid grid-cols-1 ${draft.file ? 'lg:grid-cols-[1fr_1.15fr]' : ''}`}>
      {draft.file && <DocPreview draft={draft} />}
      <div className="flex flex-col gap-4 p-5 sm:p-6">
        <div>
          <p className="mb-2 text-xs font-bold text-muted">Booking type</p>
          <div className="flex flex-wrap gap-2">
            {types.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setDraft({ ...draft, type: id })} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold ${draft.type === id ? 'bg-primary text-white dark:text-on-primary' : 'border border-line text-ink hover:bg-tint'}`}>
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {fieldsFor(draft.type).map((k) => {
            const conf = draft.conf[k]
            const isCheck = conf === 'Check'
            const wide = k === 'location' || k === 'title'
            return (
              <label key={k} className={`flex flex-col gap-1.5 ${wide ? 'sm:col-span-2' : ''}`}>
                <span className="flex items-center justify-between text-xs font-bold text-muted">
                  {labels[k]}
                  {conf && (
                    <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] ${isCheck ? 'bg-highlight-soft text-highlight' : 'text-accent'}`}>
                      {isCheck ? <TriangleAlert size={11} /> : <BarChart3 size={11} />} {isCheck ? 'Please check' : conf}
                    </span>
                  )}
                </span>
                {k === 'end' && isCheck && draft.checkOutOptions ? (
                  <div className="flex flex-col gap-2 rounded-xl border-2 border-highlight bg-highlight-soft/40 p-3">
                    <p className="text-xs text-ink">Two times in the document: 11:00, and 12:00 for late check-out. Which one is yours?</p>
                    <div className="flex gap-2">
                      {draft.checkOutOptions.map((o, i) => (
                        <button key={o} type="button" onClick={() => set('end', o)} className="flex-1 rounded-lg border border-line bg-surface px-2 py-2 text-sm font-bold text-ink hover:border-link">
                          {o.slice(11, 16)}
                          <span className="block text-[11px] font-semibold text-muted">{i ? 'Late check-out' : 'Standard'}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : k === 'start' || k === 'end' ? (
                  <input type="datetime-local" value={draft[k]} onChange={(e) => set(k, e.target.value)} className={input} />
                ) : (
                  <input value={draft[k]} onChange={(e) => set(k, e.target.value)} inputMode={k === 'price' || k === 'guests' ? 'numeric' : undefined} placeholder={k === 'title' ? 'e.g. Vatican Museums' : ''} className={input} />
                )}
              </label>
            )
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-tint/60 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-muted">{trip === 'unsorted' ? 'No trip matches these dates' : 'Suggested trip · dates match'}</p>
            <p className="font-bold text-ink">{t ? `Add to ${t.city}, ${t.country} (${fmtRange(t)})` : 'Keep in Unsorted'}</p>
          </div>
          <select value={trip} onChange={(e) => setTrip(e.target.value)} aria-label="Change trip" className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-bold text-ink">
            {upcomingTrips().map((x) => <option key={x.id} value={x.id}>{x.city} · {fmtRange(x)}</option>)}
            <option value="unsorted">Unsorted</option>
          </select>
        </div>
      </div>
    </div>
  )
}

function DocPreview({ draft }: { draft: Draft }) {
  const hl = (k: string, text: string) => (
    <span className={`rounded px-1 ${draft.conf[k] === 'Check' ? 'bg-highlight-soft ring-1 ring-highlight' : 'bg-[#dff3f8]'}`}>{text}</span>
  )
  return (
    <div className="flex flex-col gap-3 border-b border-line bg-bg p-5 sm:p-6 lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between text-xs font-bold text-muted">
        <span className="flex items-center gap-1.5 truncate"><FileText size={14} /> {draft.file}</span>
        <span>Page 1 of 2</span>
      </div>
      <div className="flex flex-col gap-2.5 rounded-lg bg-white p-5 text-[13px] text-[#1f2d44] shadow-sm">
        <div className="flex items-center justify-between">
          <span className="rounded bg-[#003580] px-2 py-0.5 text-sm font-extrabold text-white">Booking.com</span>
          <span className="text-[11px] text-[#5a6b85]">Booking confirmation</span>
        </div>
        <p className="text-base font-extrabold">Hotel Quirinale ★★★★</p>
        <p>{hl('location', 'Via Nazionale 7, 00184 Roma, Italy')}</p>
        {[
          ['Confirmation', hl('ref', '5530117')],
          ['Check-in', hl('start', 'Sun 15 Nov 2026, from 15:00')],
          ['Check-out', hl('end', 'Mon 16 Nov 2026, until 11:00')],
          ['Guests', hl('guests', '2 adults')],
          ['Room', 'Superior Double Room, breakfast included'],
        ].map(([k, v]) => (
          <div key={String(k)} className="grid grid-cols-[96px_1fr] gap-2 border-t border-[#eef1f6] pt-2">
            <span className="text-[#5a6b85]">{k}</span>
            <span>{v}</span>
          </div>
        ))}
        <p className="rounded bg-[#f6f8fd] p-2 text-[11px] text-[#5a6b85]">Late check-out until 12:00 may be available on request. Free cancellation until 13 Nov 2026.</p>
        <div className="flex items-center justify-between border-t border-[#eef1f6] pt-2 font-bold">
          <span>Total price</span>
          {hl('price', '€ 145.00')}
        </div>
      </div>
      <div className="flex gap-4 text-[11px] font-semibold text-muted">
        <span className="flex items-center gap-1"><span className="size-2.5 rounded-sm bg-[#dff3f8]" /> Extracted</span>
        <span className="flex items-center gap-1"><span className="size-2.5 rounded-sm bg-highlight-soft ring-1 ring-highlight" /> Needs your check</span>
      </div>
    </div>
  )
}

function ReviewFooter({ draft, onBack, onSave }: { draft: Draft; onBack: () => void; onSave: () => void }) {
  const fields = fieldsFor(draft.type)
  const toCheck = fields.filter((k) => draft.conf[k] === 'Check').length
  const missing = !draft.start || !draft.title || (draft.type === 'hotel' && !draft.end)
  return (
    <>
      <button onClick={onBack} className="rounded-xl border border-line px-4 py-2.5 text-sm font-bold text-ink hover:bg-tint">Back</button>
      <span className="ml-auto text-xs font-semibold text-muted">
        {draft.file ? `${fields.length - toCheck} of ${fields.length} fields look right` : 'Fill in at least the name and date'}
        {toCheck > 0 && <b className="text-highlight"> · {toCheck} to check</b>}
      </span>
      <button onClick={onSave} disabled={toCheck > 0 || missing} className="rounded-xl bg-highlight px-5 py-2.5 text-sm font-bold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40">
        Save booking
      </button>
    </>
  )
}

/* ---------- step 3 ---------- */
function SavedStep({ b }: { b: Booking }) {
  const t = tripById(b.tripId)
  const gap = t ? gaps().find((g) => g.tripId === t.id) : undefined
  const r = t ? readiness(t) : undefined
  const Icon = types.find((x) => x.id === b.type)?.icon ?? Ticket
  return (
    <div className="mx-auto flex max-w-[520px] flex-col items-center gap-4 px-6 py-10 text-center">
      <CheckCircle2 size={54} className="text-success" />
      <h3 className="text-2xl font-extrabold text-ink">{t ? `Booking added to ${t.city} trip` : 'Booking saved to Unsorted'}</h3>
      <p className="text-sm text-muted">{t ? 'We’ve placed it in your day plan and updated the trip’s checklist.' : 'Add it to a trip from My trips → Unsorted.'}</p>
      <div className="flex w-full items-center gap-3 rounded-2xl border border-line p-4 text-left">
        <span className="grid size-11 place-items-center rounded-xl bg-tint text-primary"><Icon size={20} /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-ink">{b.title}</p>
          <p className="text-xs text-muted">
            {fmtDay(b.start)}
            {b.end ? `–${fmtDay(b.end)}` : ''} · Ref {b.ref}
          </p>
        </div>
        {t && <span className="rounded-full bg-tint px-2.5 py-1 text-xs font-bold text-primary">{t.city}</span>}
      </div>
      {t && r && (gap ? (
        <p className="w-full rounded-xl bg-highlight-soft px-4 py-3 text-sm font-bold text-on-highlight-soft">The night of {fmtDay(gap.date)} is still without a hotel.</p>
      ) : (
        <p className="w-full rounded-xl bg-success/10 px-4 py-3 text-sm font-bold text-success">All {nights(t)} nights now have a stay — trip ready {r.done}/{r.total}.</p>
      ))}
    </div>
  )
}
