import Link from 'next/link'
import QuoteImage from '@/components/site/QuoteImage'
import { printHref } from '@/libs/print-link'
import { quoteAlt } from '@/libs/quote-text'

/** Shop list thumb — click opens print; desktop hover peeks a large card. */
export default function ShopQuoteThumb({ quote }) {
  return (
    <span className="group relative z-0 shrink-0 hover:z-40">
      <Link
        href={printHref(quote.slug)}
        className="relative block aspect-[4/5] w-16 overflow-hidden bg-ink sm:w-20"
        aria-label={`Print quote #${quote.n}`}
      >
        <QuoteImage
          src={quote.src}
          alt={quoteAlt(quote)}
          fill
          variant="shop"
          className="object-cover"
        />
      </Link>
      <span
        aria-hidden
        className="pointer-events-none absolute left-[calc(100%+0.75rem)] top-0 z-40 hidden w-72 md:group-hover:block"
      >
        <span className="relative block aspect-[4/5] w-full overflow-hidden bg-ink shadow-[0_12px_40px_rgba(0,0,0,0.45)] ring-1 ring-line">
          <QuoteImage src={quote.src} alt="" fill variant="detail" className="object-cover" />
        </span>
      </span>
    </span>
  )
}
