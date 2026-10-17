export { default as DashSection } from './DashSection'

export function DashPanel({ title, children, className = '' }) {
  return (
    <section className={`border border-line p-6 ${className}`}>
      {title ? <h2 className="heading-sm mb-4">{title}</h2> : null}
      {children}
    </section>
  )
}

export function Stat({ label, value, hint }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.2em] text-quiet">{label}</p>
      <p className="mt-1 font-display text-2xl text-paper">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-quiet">{hint}</p> : null}
    </div>
  )
}
