import type { ReactNode } from 'react'
import { BedDouble, Landmark, Plane, Ticket, TrainFront, Utensils } from 'lucide-react'
import type { BookingType } from '../data/types'

export const typeIcon: Record<BookingType, typeof Plane> = {
  flight: Plane,
  hotel: BedDouble,
  train: TrainFront,
  museum: Landmark,
  restaurant: Utensils,
  tour: Ticket,
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-surface ${className}`}>{children}</div>
}

export function IconTile({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`grid size-8 flex-none place-items-center rounded-lg bg-tint text-primary ${className}`}>{children}</span>
}

export function ReadinessBar({ done, total, label = 'Trip readiness' }: { done: number; total: number; label?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between text-xs font-semibold text-muted">
        <span>{label}</span>
        <span className="text-ink">
          {done}/{total}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-tint">
        <div className="h-full rounded-full bg-link" style={{ width: `${(done / total) * 100}%` }} />
      </div>
    </div>
  )
}

/** Image with a branded gradient fallback (Wikimedia can be slow or blocked). */
export function Photo({ src, alt, className = '', style }: { src: string; alt: string; className?: string; style?: React.CSSProperties }) {
  return (
    <div style={style} className={`relative overflow-hidden bg-gradient-to-br from-[#c9a77c] to-[#7a5a3c] ${className}`}>
      <img src={src} alt={alt} loading="lazy" className="absolute inset-0 size-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
    </div>
  )
}
