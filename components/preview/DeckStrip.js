import Link from 'next/link'
import QuoteImage from '@/components/site/QuoteImage'
import { previewCopy as c } from '@/config/preview'
import { quoteAlt } from '@/libs/quote-text'

/** One sideways row of the newest cards — replaces the old gallery + feed pair. */
export default function DeckStrip({ items }) {
  if (!items.length) return null
  return (
    <section className="border-t border-line">
      <div className="section pb-12 md:pb-16">
        <div className="shell-inner">
          <div className="mb-8 flex items-baseline justify-between gap-4">
            <h2 className="heading-sm">{c.deckLabel}</h2>
            <Link href="/quotes" className="nav-link text-accent">
              {c.deckAll} →
            </Link>
          </div>
        </div>
        <ul className="pv-strip">
          {items.map((q, i) => (
            <li key={q.slug} className="pv-strip-item" style={{ '--tilt': `${i % 2 ? 1.5 : -1.5}deg` }}>
              <Link href={`/quotes/${q.slug}`} className="pv-card block">
                <QuoteImage src={q.src} alt={quoteAlt(q)} variant="grid" className="h-auto w-full" />
              </Link>
              <p className="mt-3 font-display text-sm text-quiet">#{q.n}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
