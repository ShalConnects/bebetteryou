'use client'

import Link from 'next/link'
import QuoteImage from '@/components/site/QuoteImage'
import { appConfig } from '@/config/app'
import { quoteShowsScripture } from '@/libs/scripture-core'
import { printHref } from '@/libs/print-link'
import { isPrintableQuote, quoteAlt, quoteLabel } from '@/libs/quote-text'
import { shareOrCopy } from '@/libs/share'
import { useTradition } from './TraditionProvider'

/** Corner labels sitting on the card's bottom edge — passage left, share right. */
const note = 'inline-flex min-h-10 items-center px-2 text-[10px] uppercase tracking-[0.2em] text-paper drop-shadow'

export default function QuoteCard({ quote, priority, className = '' }) {
  const { tagThemesMap } = useTradition()
  const href = `/quotes/${quote.slug}`
  const label = quoteLabel(quote)

  async function onShare(e) {
    e.preventDefault()
    e.stopPropagation()
    try {
      await shareOrCopy({
        title: `Quote #${quote.n}`,
        text: label,
        url: new URL(href, window.location.origin).href,
      })
    } catch (err) {
      if (err?.name !== 'AbortError') {
        /* ignore — detail page has fuller share UI */
      }
    }
  }

  return (
    <div className={`group relative bg-ink ${className}`}>
      <Link href={href} className="block">
        <span className="relative block aspect-[4/5] w-full overflow-hidden">
          <QuoteImage
            src={quote.src}
            alt={quoteAlt(quote)}
            fill
            variant="grid"
            priority={priority}
            className="object-cover opacity-95 transition-opacity duration-300 group-hover:opacity-100"
          />
          <span className="pointer-events-none absolute inset-0 bg-ink/55 opacity-0 transition-opacity duration-300 md:[@media(hover:hover)]:group-hover:opacity-100" />
          {quoteShowsScripture(quote.tags, quote.theme, tagThemesMap) ? (
            <span className={`pointer-events-none absolute bottom-0 left-0 ${note}`}>+ passage</span>
          ) : null}
        </span>
      </Link>
      <div className="pointer-events-none absolute bottom-0 right-0 z-10 flex items-center justify-center opacity-100 transition-opacity duration-300 md:[@media(hover:hover)]:inset-0 md:[@media(hover:hover)]:opacity-0 md:[@media(hover:hover)]:group-hover:opacity-100">
        {/* Only offerable when the words exist as text; most cards are scans. */}
        {appConfig.features.enablePrintShop && isPrintableQuote(quote) ? (
          <Link href={printHref(quote.slug)} className={`pointer-events-auto ${note}`}>
            Print
          </Link>
        ) : null}
        <button
          type="button"
          onClick={onShare}
          className={`pointer-events-auto ${note}`}
          aria-label={`Share quote #${quote.n}`}
        >
          Share
        </button>
      </div>
    </div>
  )
}
