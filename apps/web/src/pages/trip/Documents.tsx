import { Link } from 'react-router-dom'
import { Download, Eye, FileText, Mail, UploadCloud, WifiOff } from 'lucide-react'
import type { Booking, Trip } from '../../data/types'
import { bookingsFor, fmtDay } from '../../lib/trips'
import { Card, typeIcon } from '../../components/ui'

/** Every imported booking keeps its original email or PDF. Manual bookings have none. */
export const documentsFor = (tripId: string) => bookingsFor(tripId).filter((b) => b.source !== 'Manual')

const docName = (b: Booking) =>
  b.type === 'flight' ? `${b.provider} e-ticket · ${b.title.split('· ')[1]}` : b.type === 'hotel' ? `Booking confirmation · ${b.title}` : b.type === 'train' ? `${b.provider} ticket · ${b.title.split('· ')[1] ?? b.title}` : `${b.title} · confirmation`

export function Documents({ trip }: { trip: Trip }) {
  const docs = documentsFor(trip.id)
  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-2xl font-extrabold text-ink">{docs.length} documents</h2>
          <span className="flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-bold text-success"><WifiOff size={13} /> All saved for offline use</span>
        </div>
        <Card className="divide-y divide-line">
          {docs.map((b) => {
            const Icon = typeIcon[b.type]
            const isPdf = b.source === 'PDF' || b.type === 'flight' || b.type === 'train'
            return (
              <div key={b.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4">
                <span className={`grid size-11 flex-none place-items-center rounded-xl ${isPdf ? 'bg-highlight-soft text-highlight' : 'bg-tint text-primary'}`}>
                  {isPdf ? <FileText size={20} /> : <Mail size={20} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-ink">{docName(b)}</p>
                  <p className="flex items-center gap-2 text-[13px] text-muted">
                    <span className="rounded bg-tint px-1.5 text-[11px] font-bold text-primary">{isPdf ? 'PDF' : 'EMAIL'}</span>
                    From {b.source === 'Booking.com' ? 'Booking.com' : b.provider} · added {fmtDay(b.addedAt)}
                  </p>
                </div>
                <Link to={`/trips/${trip.id}/bookings?open=${b.id}`} className="flex items-center gap-1.5 text-[13px] font-bold text-link"><Icon size={14} /> Booking</Link>
                <button aria-label="Preview" className="grid size-9 place-items-center rounded-lg text-muted hover:bg-tint hover:text-ink"><Eye size={17} /></button>
                <button aria-label="Download" className="grid size-9 place-items-center rounded-lg text-muted hover:bg-tint hover:text-ink"><Download size={17} /></button>
              </div>
            )
          })}
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <button className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-link/50 bg-surface p-8 text-center hover:bg-tint/40">
          <UploadCloud size={28} className="text-link" />
          <span className="font-bold text-ink">Drop a PDF or screenshot</span>
          <span className="text-xs text-muted">We'll read it and add the booking to this trip</span>
        </button>
        <Card className="p-5 text-sm text-muted">
          <p className="mb-1 font-bold text-ink">Tip</p>
          Forward confirmation emails to <b className="text-ink">esra@in.waypad.app</b> — the original is saved here automatically.
        </Card>
      </div>
    </div>
  )
}
