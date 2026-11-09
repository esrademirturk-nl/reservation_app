import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ChevronDown, Clock } from 'lucide-react'
import { MODES, getMode, setMode, type DemoMode } from '../lib/store'

/** Presentation helper: jump between the moments of the demo story. */
export function DemoSwitcher() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const current = MODES.find((m) => m.id === getMode())!

  useEffect(() => {
    if (!open) return
    const down = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false)
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', down)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('mousedown', down)
      document.removeEventListener('keydown', key)
    }
  }, [open])

  const pick = (m: DemoMode) => {
    setMode(m)
    setOpen(false)
    navigate('/')
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label="Demo moment"
        className="flex items-center gap-1.5 rounded-full border border-dashed border-link/60 px-3 py-1.5 text-xs font-bold text-link hover:bg-tint"
      >
        <Clock size={14} />
        <span className="hidden sm:inline">Demo: {current.label}</span>
        <ChevronDown size={13} />
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-72 rounded-xl border border-line bg-surface p-2 shadow-card">
          <p className="px-3 pb-2 pt-1 text-xs font-bold uppercase tracking-wider text-muted">Demo moment</p>
          {MODES.map((m) => (
            <button key={m.id} onClick={() => pick(m.id)} className="flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left hover:bg-tint">
              <span className="mt-0.5 w-4 text-link">{m.id === current.id && <Check size={15} />}</span>
              <span>
                <span className="block text-sm font-bold text-ink">{m.label}</span>
                <span className="block text-xs text-muted">{m.note}</span>
              </span>
            </button>
          ))}
          <p className="border-t border-line px-3 pt-2 text-[11px] text-muted">Wallet → Today always shows the travel day (12 Nov).</p>
        </div>
      )}
    </div>
  )
}
