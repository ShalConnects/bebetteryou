import Link from 'next/link'

export { default as DashSection } from './DashSection'

export function DashPanel({ title, children, className = '' }) {
  return (
    <section className={`border border-line p-6 ${className}`}>
      {title ? <h2 className="heading-sm mb-4">{title}</h2> : null}
      {children}
    </section>
  )
}

export function Stat({ label, value }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.2em] text-quiet">{label}</p>
      <p className="mt-1 font-display text-2xl text-paper">{value}</p>
    </div>
  )
}

export function ActionLink({ href, title, children }) {
  return (
    <Link href={href} className="block border border-line p-6 transition-colors hover:border-paper/40">
      <h3 className="font-display text-lg text-paper">{title}</h3>
      <p className="mt-2 text-sm text-quiet">{children}</p>
    </Link>
  )
}
