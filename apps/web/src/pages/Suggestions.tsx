import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Heart, Star, X } from 'lucide-react'
import { suggestions, type Suggestion } from '../data/suggestions'
import { fmtRange, upcomingTrips } from '../lib/trips'
import { Card, Photo } from '../components/ui'

export function Suggestions() {
  const trips = upcomingTrips().filter((t) => suggestions[t.id])
  const [params, setParams] = useSearchParams()
  const tripId = params.get('trip') ?? trips[0]?.id
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const toggle = (set: Set<string>, id: string) => {
    const n = new Set(set)
    if (n.has(id)) n.delete(id)
    else n.add(id)
    return n
  }

  return (
    <div className="mx-auto flex max-w-[1120px] flex-col gap-8">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:gap-6">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-[26px] sm:text-[32px] font-extrabold tracking-tight text-ink">Suggestions</h1>
            <p className="mt-1 text-[15px] text-muted">Ideas to make your upcoming trips better</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {trips.map((t) => (
              <button key={t.id} onClick={() => setParams({ trip: t.id })} className={`rounded-full border px-4 py-2 text-sm font-bold ${t.id === tripId ? 'border-primary bg-primary text-white dark:text-on-primary' : 'border-line bg-surface text-ink hover:bg-tint'}`}>
                {t.city}{t.id === tripId ? ` · ${fmtRange(t)}` : ''}
              </button>
            ))}
          </div>
        </div>
        <Card className="px-5 py-4">
          <div className="flex items-center justify-between gap-8">
            <span className="text-sm font-bold text-ink">Your travel style</span>
            <button className="text-sm font-bold text-link">Edit</button>
          </div>
          <p className="mt-1 text-sm text-muted">€€ budget · Museums · Coffee · Walking</p>
        </Card>
      </div>

      {(suggestions[tripId] ?? []).map((section) => (
        <section key={section.id} className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-extrabold text-ink">{section.title}</h2>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${section.badge.tone === 'warn' ? 'bg-highlight-soft text-highlight' : 'bg-tint text-primary'}`}>{section.badge.label}</span>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {section.items.map((s) =>
              hidden.has(s.id) ? (
                <div key={s.id} className="flex min-h-[200px] flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-line text-sm text-muted">
                  Got it — we'll show fewer like this
                  <button onClick={() => setHidden(toggle(hidden, s.id))} className="font-bold text-link">Undo</button>
                </div>
              ) : (
                <SuggestionCard key={s.id} s={s} saved={saved.has(s.id)} onSave={() => setSaved(toggle(saved, s.id))} onHide={() => setHidden(toggle(hidden, s.id))} />
              ),
            )}
          </div>
        </section>
      ))}
    </div>
  )
}

function SuggestionCard({ s, saved, onSave, onHide }: { s: Suggestion; saved: boolean; onSave: () => void; onHide: () => void }) {
  const primary = s.cta === 'View & book'
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface transition-shadow hover:shadow-card">
      <div className="relative">
        <Photo src={s.photo} alt={s.title} className="h-[140px]" />
        <div className="absolute right-3 top-3 flex gap-1.5">
          <button onClick={onSave} className={`flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold ${saved ? 'text-highlight' : 'text-[#043263]'}`}>
            <Heart size={12} fill={saved ? 'currentColor' : 'none'} /> {saved ? 'Saved' : 'Save'}
          </button>
          <button onClick={onHide} className="flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-[#043263]"><X size={12} /> Not for me</button>
        </div>
        {s.tags && (
          <div className="absolute bottom-3 left-3 flex gap-1.5">
            {s.tags.map((t) => (
              <span key={t.label} className={`rounded-full px-2.5 py-1 text-xs font-bold ${t.tone === 'warn' ? 'bg-highlight text-white' : 'bg-white/95 text-[#043263]'}`}>{t.label}</span>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <span className="text-xs font-extrabold uppercase tracking-wider text-accent">{s.kind}</span>
        <h3 className="text-lg font-extrabold text-ink">{s.title}</h3>
        <p className="flex flex-wrap items-center gap-x-3 text-[13px] font-semibold text-muted">
          {s.facts.map((f, i) => (
            <span key={f} className="flex items-center gap-1">{i === 0 && /^\d\.\d$/.test(f) && <Star size={12} className="fill-highlight text-highlight" />}{f}</span>
          ))}
        </p>
        <p className="text-sm italic text-ink">{s.why}</p>
        <button className={`mt-auto rounded-xl py-2.5 text-sm font-bold ${primary ? 'bg-highlight text-white hover:brightness-110' : 'border border-line text-ink hover:bg-tint'}`}>{s.cta}</button>
      </div>
    </div>
  )
}
