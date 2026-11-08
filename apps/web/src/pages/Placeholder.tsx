import { Link } from 'react-router-dom'

export function Placeholder({ title, design }: { title: string; design: string }) {
  return (
    <div className="mx-auto flex max-w-[1120px] flex-col gap-3">
      <h1 className="text-[32px] font-extrabold tracking-tight text-ink">{title}</h1>
      <p className="text-muted">
        Coming next — built from design frame <b className="text-ink">{design}</b>.
      </p>
      <Link to="/" className="text-sm font-bold text-link">
        ← Back to dashboard
      </Link>
    </div>
  )
}
