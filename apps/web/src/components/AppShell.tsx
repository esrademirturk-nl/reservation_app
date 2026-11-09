import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Bell, ChevronsUpDown, CircleHelp, Globe, LayoutGrid, Lightbulb, LogOut, Map, Moon, Search, Settings, Sparkles, Sun, Ticket } from 'lucide-react'
import { user } from '../data/demo'
import { MiniPlayer } from './MiniPlayer'
import { AddBookingProvider } from './AddBooking'
import { DemoSwitcher } from './DemoSwitcher'
import { useStoreVersion } from '../lib/store'

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutGrid, end: true },
  { to: '/trips', label: 'My trips', icon: Map },
  { to: '/wallet', label: 'Wallet', icon: Ticket },
  { to: '/suggestions', label: 'Suggestions', icon: Lightbulb },
]

function useTheme() {
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem('waypad-theme') === 'dark'
    } catch {
      return false
    }
  })
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    try {
      localStorage.setItem('waypad-theme', dark ? 'dark' : 'light')
    } catch {
      /* storage unavailable */
    }
  }, [dark])
  return [dark, setDark] as const
}

export function AppShell() {
  const [dark, setDark] = useTheme()
  const version = useStoreVersion()

  return (
    <AddBookingProvider>
    <div className="min-h-screen bg-bg lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-surface px-4 py-6 lg:flex">
        <img src={`${import.meta.env.BASE_URL}${dark ? 'waypad-logo-dark.png' : 'waypad-logo-light.png'}`} alt="Waypad" className="mb-8 ml-2 h-7 w-auto self-start" />
        <nav className="flex flex-col gap-1">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[15px] font-semibold transition-colors ${
                  isActive ? 'bg-tint text-ink' : 'text-muted hover:bg-tint/50 hover:text-ink'
                }`
              }
            >
              <Icon size={18} strokeWidth={2} />
              {label}
            </NavLink>
          ))}
        </nav>

        <AvatarMenu />
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-line bg-surface/95 px-4 backdrop-blur sm:px-6 lg:h-[76px] lg:px-10">
          <img src={`${import.meta.env.BASE_URL}${dark ? 'waypad-logo-dark.png' : 'waypad-logo-light.png'}`} alt="Waypad" className="h-6 w-auto lg:hidden" />
          <label className="hidden min-w-0 flex-1 items-center md:flex lg:max-w-[460px] gap-3 rounded-xl border border-line bg-bg px-4 py-2.5 text-sm text-muted">
            <Search size={16} />
            <input className="flex-1 bg-transparent text-ink outline-none placeholder:text-muted" placeholder="Search trips, bookings, cities" />
            <kbd className="rounded-md border border-line bg-surface px-1.5 py-0.5 text-[11px] font-semibold">⌘K</kbd>
          </label>
          <div className="flex items-center gap-2">
            <DemoSwitcher />
            <button
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={() => setDark(!dark)}
              className="grid size-10 place-items-center rounded-full text-ink hover:bg-tint"
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button aria-label="Notifications" className="relative grid size-10 place-items-center rounded-full text-ink hover:bg-tint">
              <Bell size={18} />
              <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-accent-decor" />
            </button>
            <div className="lg:hidden"><AvatarMenu compact /></div>
          </div>
        </header>
        <main className="flex-1 px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-16 lg:pt-9">
          <Outlet key={version} />
        </main>
        <MiniPlayer />
      </div>

      {/* Bottom tab bar on phones and tablets */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `flex flex-col items-center gap-1 py-2.5 text-[11px] font-bold ${isActive ? 'text-primary' : 'text-muted'}`}
          >
            {({ isActive }) => (
              <>
                <span className={`grid h-7 w-12 place-items-center rounded-full ${isActive ? 'bg-tint' : ''}`}><Icon size={19} /></span>
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
    </AddBookingProvider>
  )
}

function AvatarMenu({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const item = 'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold text-ink hover:bg-tint'
  return (
    <div ref={ref} className={compact ? 'relative' : 'relative mt-auto'}>
      {open && (
        <div className={`absolute z-50 rounded-xl border border-line bg-surface p-2 shadow-card ${compact ? 'right-0 top-12 w-64' : 'bottom-full left-0 right-0 mb-2'}`}>
          <div className="border-b border-line px-3 pb-3 pt-1">
            <p className="text-sm font-bold text-ink">{user.fullName}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
          <div className="flex flex-col gap-0.5 py-2">
            <button className={item}><Globe size={16} className="text-muted" /> Language <span className="ml-auto text-xs font-semibold text-muted">English</span></button>
            <button className={item}><Settings size={16} className="text-muted" /> Settings</button>
            <button className={item}><CircleHelp size={16} className="text-muted" /> Help</button>
            <button className={`${item} bg-tint`}><Sparkles size={16} className="text-accent" /> Upgrade plan <span className="ml-auto text-xs font-extrabold text-accent">PRO</span></button>
          </div>
          <div className="border-t border-line pt-2">
            <button className={`${item} text-error`}><LogOut size={16} /> Log out</button>
          </div>
        </div>
      )}
      {compact ? (
        <button onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Account menu" className="grid size-9 place-items-center rounded-full bg-accent-decor text-sm font-bold text-white">
          {user.initials}
        </button>
      ) : (
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface p-3 text-left hover:bg-tint/40"
      >
        <span className="grid size-9 place-items-center rounded-full bg-accent-decor text-sm font-bold text-white">{user.initials}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-ink">{user.fullName}</span>
          <span className="block text-xs text-muted">{user.plan}</span>
        </span>
        <ChevronsUpDown size={16} className="text-muted" />
      </button>
      )}
    </div>
  )
}
