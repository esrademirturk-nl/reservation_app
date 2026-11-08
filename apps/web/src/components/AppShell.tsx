import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Bell, ChevronsUpDown, LayoutGrid, Lightbulb, Map, Moon, Search, Sun, Ticket } from 'lucide-react'
import { user } from '../data/demo'

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

  return (
    <div className="grid min-h-screen grid-cols-[240px_minmax(0,1fr)] bg-bg">
      <aside className="sticky top-0 flex h-screen flex-col border-r border-line bg-surface px-4 py-6">
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

        <button className="mt-auto flex items-center gap-3 rounded-xl border border-line bg-surface p-3 text-left hover:bg-tint/40">
          <span className="grid size-9 place-items-center rounded-full bg-accent-decor text-sm font-bold text-white">{user.initials}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold text-ink">{user.fullName}</span>
            <span className="block text-xs text-muted">{user.plan}</span>
          </span>
          <ChevronsUpDown size={16} className="text-muted" />
        </button>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-line bg-surface/95 px-10 backdrop-blur">
          <label className="flex w-[460px] items-center gap-3 rounded-xl border border-line bg-bg px-4 py-2.5 text-sm text-muted">
            <Search size={16} />
            <input className="flex-1 bg-transparent text-ink outline-none placeholder:text-muted" placeholder="Search trips, bookings, cities" />
            <kbd className="rounded-md border border-line bg-surface px-1.5 py-0.5 text-[11px] font-semibold">⌘K</kbd>
          </label>
          <div className="flex items-center gap-2">
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
          </div>
        </header>
        <main className="flex-1 px-10 pb-16 pt-9">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
