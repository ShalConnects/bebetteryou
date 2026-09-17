'use client'

import Link from 'next/link'
import QuoteImage from '@/components/site/QuoteImage'
import { appConfig } from '@/config/app'
import { quoteShowsScripture } from '@/libs/scripture-core'
import { printHref } from '@/libs/print-link'
import { isPrintableQuote, quoteAlt, quoteLabel } from '@/libs/quote-text'
import { shareOrCopy } from '@/libs/share'
import { useTradition } from './TraditionProvider'

/** Mobile: compact icon hits. md+: text labels like before. */
const chrome =
  'inline-flex h-7 w-7 items-center justify-center text-paper drop-shadow md:h-auto md:min-h-10 md:w-auto md:px-2 md:text-[11px] md:uppercase md:tracking-[0.2em]'

function Icon({ children }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="13"
      height="13"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
      className="md:hidden"
    >
      {children}
    </svg>
  )
}

function Label({ children }) {
  return <span className="hidden md:inline">{children}</span>
}

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
    <div className={`group relative bg-ink ring-1 ring-line ${className}`}>
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
        <span
          className={`quote-card-passage pointer-events-none absolute bottom-0 left-0 z-10 ${chrome}`}
          aria-label="Related passage"
          title="Related passage"
        >
          <Icon>
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" strokeLinecap="round" strokeLinejoin="round" />
            <path
              d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M12 7v6M9 10h6" strokeLinecap="round" />
          </Icon>
          <Label>+ passage</Label>
        </span>
      ) : null}

      <div className="pointer-events-none absolute bottom-0 right-0 z-10 flex items-center">
        <button
          type="button"
          onClick={onShare}
          className={`quote-card-share pointer-events-auto ${chrome}`}
          aria-label={`Share quote #${quote.n}`}
        >
          <Icon>
            <circle cx="18" cy="5" r="2.5" />
            <circle cx="6" cy="12" r="2.5" />
            <circle cx="18" cy="19" r="2.5" />
            <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" strokeLinecap="round" />
          </Icon>
          <Label>Share</Label>
        </button>
        {canPrint ? (
          <Link
            href={printHref(quote.slug)}
            className={`quote-card-print pointer-events-auto ${chrome}`}
            aria-label={`Print quote #${quote.n}`}
          >
            <Icon>
              <path
                d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M6 14h12v7H6z" strokeLinecap="round" strokeLinejoin="round" />
            </Icon>
            <Label>Print</Label>
          </Link>
        ) : null}
      </div>
    </div>
  )
}
