'use client'

import Link from 'next/link'
import QuoteImage from '@/components/site/QuoteImage'
import { appConfig } from '@/config/app'
import { quoteShowsScripture } from '@/libs/scripture-core'
import { printHref } from '@/libs/print-link'
import { isPrintableQuote, quoteAlt, quoteLabel } from '@/libs/quote-text'
import { shareOrCopy } from '@/libs/share'
import { useTradition } from './TraditionProvider'

/** Card chrome — 10px mobile / 11px md+. */
const note =
  'inline-flex min-h-10 items-center px-1.5 text-[10px] uppercase tracking-[0.15em] text-paper drop-shadow md:px-2 md:text-[11px] md:tracking-[0.2em]'

export default function QuoteCard({ quote, priority, className = '' }) {
  const { tagThemesMap } = useTradition()
  const href = `/quotes/${quote.slug}`
  const label = quoteLabel(quote)
  const showPassage = quoteShowsScripture(quote.tags, quote.theme, tagThemesMap)
  const canPrint = appConfig.features.enablePrintShop && isPrintableQuote(quote)

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
          <span className="pointer-events-none absolute inset-0 bg-ink/55 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        </span>
      </Link>

      {showPassage ? (
        <span className={`quote-card-passage pointer-events-none absolute bottom-0 left-0 z-10 ${note}`}>
          + passage
        </span>
      ) : null}

      <div className="pointer-events-none absolute bottom-0 right-0 z-10 flex items-center">
        <button
          type="button"
          onClick={onShare}
          className={`quote-card-share pointer-events-auto ${note}`}
          aria-label={`Share quote #${quote.n}`}
        >
          Share
        </button>
        {canPrint ? (
          <Link href={printHref(quote.slug)} className={`quote-card-print pointer-events-auto ${note}`}>
            Print
          </Link>
        ) : null}
      </div>
    </div>
  )
}
