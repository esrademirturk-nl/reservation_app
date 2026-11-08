import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Check, ChevronLeft, Minus, Plus } from 'lucide-react'
import { user } from '../../data/demo'
import { tripById } from '../../lib/trips'
import { Card } from '../../components/ui'
import { BackCover, Cover, SpreadView, type Theme } from './BookPages'

const sizes = [
  { id: 's', name: 'Small', dims: '20×20 cm', price: 29 },
  { id: 'm', name: 'Medium', dims: '21×28 cm', price: 39, popular: true },
  { id: 'l', name: 'Large', dims: '30×30 cm', price: 59 },
]
const SHIPPING = 4.95

export function OrderBook() {
  const { tripId = '' } = useParams()
  const [params] = useSearchParams()
  const theme = (params.get('theme') as Theme) || 'editorial'
  const trip = tripById(tripId)
  const [view, setView] = useState<'front' | 'spread' | 'back'>('front')
  const [size, setSize] = useState('m')
  const [hard, setHard] = useState(true)
  const [matte, setMatte] = useState(true)
  const [copies, setCopies] = useState(1)
  const [placed, setPlaced] = useState(false)
  if (!trip) return null

  const base = sizes.find((s) => s.id === size)!.price - (hard ? 0 : 8)
  const books = base + (copies - 1) * base * 0.8
  const total = books + SHIPPING
  const eur = (n: number) => `€${n.toFixed(2)}`

  if (placed)
    return (
      <div className="mx-auto flex max-w-[520px] flex-col items-center gap-4 py-16 text-center">
        <span className="grid size-16 place-items-center rounded-full bg-success/10 text-success"><Check size={32} /></span>
        <h1 className="text-[32px] font-extrabold tracking-tight text-ink">Your book is on its way!</h1>
        <p className="text-muted">{trip.city} travel book · {sizes.find((s) => s.id === size)!.name} {hard ? 'hardcover' : 'softcover'} · {copies} {copies === 1 ? 'copy' : 'copies'}</p>
        <p className="font-bold text-ink">Estimated delivery: 5–7 working days</p>
        <Link to="/" className="mt-2 rounded-xl bg-highlight px-6 py-3 font-bold text-white">Back to dashboard</Link>
      </div>
    )

  const opt = (active: boolean) => `rounded-xl border-2 px-4 py-3 text-left ${active ? 'border-highlight bg-highlight-soft/40' : 'border-line hover:border-muted'}`

  return (
    <div className="mx-auto flex max-w-[1120px] flex-col gap-6">
      <Link to={`/trips/${trip.id}/book`} className="flex items-center gap-1 text-sm font-bold text-link"><ChevronLeft size={16} /> Back to travel book</Link>
      <h1 className="text-[32px] font-extrabold tracking-tight text-ink">Order printed book</h1>

      <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-start gap-8">
        <div className="flex flex-col gap-4">
          <div className="grid min-h-[520px] place-items-center rounded-2xl bg-[#f4f1ec] p-10 text-[13px] dark:bg-[#0b1c36]">
            {view === 'spread' ? (
              <div className="w-full"><SpreadView trip={trip} theme={theme} spread="chapter" /></div>
            ) : (
              <div className="relative w-[58%] shadow-[0_20px_40px_rgba(0,0,0,0.25)]">
                <div className="absolute inset-y-0 left-0 z-10 w-2 bg-gradient-to-r from-black/35 to-transparent" />
                {view === 'front' ? <Cover trip={trip} theme={theme} /> : <BackCover trip={trip} />}
              </div>
            )}
          </div>
          <div className="flex gap-3">
            {([['front', 'Front cover'], ['spread', 'Open spread'], ['back', 'Back cover']] as const).map(([id, label]) => (
              <button key={id} onClick={() => setView(id)} className="flex flex-col items-center gap-1.5">
                <span className={`block w-20 overflow-hidden rounded-md border-2 text-[3px] ${view === id ? 'border-highlight' : 'border-transparent'}`}>
                  {id === 'front' ? <Cover trip={trip} theme={theme} /> : id === 'back' ? <BackCover trip={trip} /> : <SpreadView trip={trip} theme={theme} spread="chapter" />}
                </span>
                <span className={`text-xs font-semibold ${view === id ? 'text-ink' : 'text-muted'}`}>{label}</span>
              </button>
            ))}
          </div>
        </div>

        <Card className="flex flex-col gap-5 p-6">
          <div>
            <p className="mb-2 text-sm font-bold text-ink">1. Size</p>
            <div className="grid grid-cols-3 gap-2">
              {sizes.map((s) => (
                <button key={s.id} onClick={() => setSize(s.id)} className={opt(size === s.id)}>
                  <span className="block text-sm font-bold text-ink">{s.name}</span>
                  <span className="block text-xs text-muted">{s.dims}</span>
                  <span className="block text-sm font-extrabold text-ink">€{s.price}</span>
                  {s.popular && <span className="mt-1 inline-block rounded-full bg-accent-decor px-2 text-[10px] font-bold text-white">Most popular</span>}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="mb-2 text-sm font-bold text-ink">2. Cover</p>
              <div className="flex flex-col gap-2">
                <button onClick={() => setHard(true)} className={opt(hard)}><span className="text-sm font-bold text-ink">Hardcover</span></button>
                <button onClick={() => setHard(false)} className={opt(!hard)}><span className="text-sm font-bold text-ink">Softcover <span className="font-semibold text-muted">−€8</span></span></button>
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-bold text-ink">Paper</p>
              <div className="flex flex-col gap-2">
                <button onClick={() => setMatte(true)} className={opt(matte)}><span className="text-sm font-bold text-ink">Matte</span></button>
                <button onClick={() => setMatte(false)} className={opt(!matte)}><span className="text-sm font-bold text-ink">Glossy</span></button>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-ink">3. Copies</p>
              <p className="text-xs text-muted">Extra copies −20%</p>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-line p-1">
              <button aria-label="Fewer copies" onClick={() => setCopies(Math.max(1, copies - 1))} className="grid size-8 place-items-center rounded-lg hover:bg-tint"><Minus size={15} /></button>
              <span className="w-4 text-center font-bold text-ink">{copies}</span>
              <button aria-label="More copies" onClick={() => setCopies(copies + 1)} className="grid size-8 place-items-center rounded-lg hover:bg-tint"><Plus size={15} /></button>
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-bold text-ink">4. Delivery address</p>
            <div className="flex items-center justify-between rounded-xl border border-line px-4 py-3 text-sm">
              <span className="text-ink">{user.fullName}, {user.home}, Netherlands</span>
              <button className="font-bold text-link">Change</button>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 rounded-xl bg-bg p-4 text-sm">
            <p className="flex justify-between text-muted">Book{copies > 1 ? ` × ${copies}` : ''} <span className="text-ink">{eur(books)}</span></p>
            <p className="flex justify-between text-muted">Shipping <span className="text-ink">{eur(SHIPPING)}</span></p>
            <p className="mt-1 flex justify-between border-t border-line pt-2 font-extrabold text-ink">Total <span>{eur(total)}</span></p>
            <p className="text-xs text-muted">Estimated delivery: 5–7 working days</p>
          </div>
          <button onClick={() => setPlaced(true)} className="rounded-xl bg-highlight py-3.5 font-bold text-white hover:brightness-110">Place order · {eur(total)}</button>
          <p className="-mt-2 text-center text-xs text-muted">Printed and shipped by our print partner</p>
        </Card>
      </div>
    </div>
  )
}
