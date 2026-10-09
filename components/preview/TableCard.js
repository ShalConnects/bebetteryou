import Link from 'next/link'
import QuoteImage from '@/components/site/QuoteImage'
import { quoteAlt } from '@/libs/quote-text'

/** A card lying on the table: tilt + shadow. Link when `href`, plain otherwise. */
export default function TableCard({ quote, href, tilt, variant = 'grid', priority, number, className = '' }) {
  const img = (
    <QuoteImage src={quote.src} alt={quoteAlt(quote)} priority={priority} variant={variant} className="h-auto w-full" />
  )
  const style = tilt ? { '--tilt': tilt } : undefined
  return (
    <div className={className}>
      {href ? (
        <Link href={href} className="pv-card block" style={style} aria-label={`Quote #${quote.n}`}>
          {img}
        </Link>
      ) : (
        <div className="pv-card" style={style}>
          {img}
        </div>
      )}
      {number ? <p className="mt-3 font-display text-sm text-quiet">#{quote.n}</p> : null}
    </div>
  )
}

/** Alternating table tilt for rows/grids. */
export const tiltAt = (i) => `${i % 2 ? 1.5 : -1.5}deg`
