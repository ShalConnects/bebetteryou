import Link from 'next/link'
import { previewCopy as c, pv } from '@/config/preview'
import SectionHead from './SectionHead'
import TableCard, { tiltAt } from './TableCard'

/** One sideways row of the newest cards — replaces the old gallery + feed pair. */
export default function DeckStrip({ items }) {
  if (!items.length) return null
  return (
    <section className="border-t border-line">
      <div className="section pb-12 md:pb-16">
        <div className="shell-inner">
          <SectionHead title={c.deckLabel}>
            <Link href={pv('/quotes')} className="nav-link text-accent">
              {c.deckAll} →
            </Link>
          </SectionHead>
        </div>
        <ul className="pv-strip">
          {items.map((q, i) => (
            <li key={q.slug} className="pv-strip-item">
              <TableCard quote={q} href={pv(`/quotes/${q.slug}`)} tilt={tiltAt(i)} number />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
