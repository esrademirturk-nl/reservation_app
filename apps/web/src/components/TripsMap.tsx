import { Link } from 'react-router-dom'
import { EUROPE_LAND } from './europe-land'
import type { Trip } from '../data/types'

/** Projection fitted to the design's illustrated map (Amsterdam, Prague, Rome anchors). */
const project = (lon: number, lat: number) => ({ x: 13.18 * lon + 241.2, y: 50.9 - 19.35 * (lat - 52.37) })

const HOME = { lon: 4.48, lat: 51.92, label: 'Rotterdam' }

interface Props {
  trips: Trip[]
  nextId?: string
}

export function TripsMap({ trips, nextId }: Props) {
  const home = project(HOME.lon, HOME.lat)
  const pts = trips.map((t) => ({ t, ...project(t.lon, t.lat) }))

  // Frame all points with padding, keep a 733:300 aspect ratio
  const all = [home, ...pts]
  const pad = 70
  let minX = Math.min(...all.map((p) => p.x)) - pad
  let maxX = Math.max(...all.map((p) => p.x)) + pad
  let minY = Math.min(...all.map((p) => p.y)) - pad
  let maxY = Math.max(...all.map((p) => p.y)) + pad
  const aspect = 733 / 300
  const w = maxX - minX
  const h = maxY - minY
  if (w / h < aspect) {
    const nw = h * aspect
    minX -= (nw - w) / 2
    maxX = minX + nw
  } else {
    const nh = w / aspect
    minY -= (nh - h) / 2
    maxY = minY + nh
  }
  const vbW = maxX - minX
  const s = vbW / 733 // keep markers the same visual size whatever the zoom

  const arc = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const mx = (a.x + b.x) / 2
    const my = (a.y + b.y) / 2
    const dx = b.x - a.x
    const dy = b.y - a.y
    return `M${a.x} ${a.y} Q${mx - dy * 0.25} ${my + dx * 0.25} ${b.x} ${b.y}`
  }

  return (
    <div className="relative w-full overflow-hidden bg-map-sea" style={{ aspectRatio: '733 / 300' }}>
      <svg viewBox={`${minX} ${minY} ${vbW} ${maxY - minY}`} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full">
        <path d={EUROPE_LAND} className="fill-map-land" stroke="var(--c-border)" strokeWidth={1.2 * s} strokeLinejoin="round" />

        {pts.map(({ t, x, y }) => (
          <path
            key={`r-${t.id}`}
            d={arc(home, { x, y })}
            fill="none"
            stroke={t.id === nextId ? 'var(--c-highlight)' : 'var(--c-link)'}
            strokeOpacity={t.id === nextId ? 0.9 : 0.45}
            strokeWidth={2 * s}
            strokeDasharray={`${6 * s} ${6 * s}`}
            strokeLinecap="round"
          />
        ))}

        <g transform={`translate(${home.x} ${home.y}) scale(${s})`}>
          <circle r="5" fill="var(--c-surface)" stroke="var(--c-text-muted)" strokeWidth="2">
            <title>Home · {HOME.label}</title>
          </circle>
        </g>
      </svg>

      {/* HTML pins so they stay crisp and clickable */}
      {pts.map(({ t, x, y }) => {
        const left = ((x - minX) / vbW) * 100
        const top = ((y - minY) / (maxY - minY)) * 100
        const isNext = t.id === nextId
        return (
          <Link
            key={t.id}
            to={`/trips/${t.id}`}
            className="group absolute -translate-x-1/2 -translate-y-full"
            style={{ left: `${left}%`, top: `${top}%` }}
          >
            <span className="flex flex-col items-center">
              <span
                className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold text-white shadow-pop sm:px-3 sm:py-1 sm:text-xs transition-transform group-hover:-translate-y-0.5 ${
                  isNext ? 'bg-highlight' : 'bg-primary dark:text-on-primary'
                }`}
              >
                {t.city}
                {isNext && <span className="hidden sm:inline"> · Next trip</span>}
              </span>
              <span className={`mt-0.5 size-3 rounded-full border-2 border-white ${isNext ? 'bg-highlight' : 'bg-primary'}`} />
            </span>
          </Link>
        )
      })}
    </div>
  )
}
