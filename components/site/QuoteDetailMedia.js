'use client'

import Link from 'next/link'
import QuoteImage from '@/components/site/QuoteImage'
import QuoteShareRail, { useShareProps } from '@/components/site/QuoteShare'
import { appConfig } from '@/config/app'
import { printHref } from '@/libs/print-link'
import { isPrintableQuote } from '@/libs/quote-text'
import { quotesHref, formatTag } from '@/libs/quotes-url'

const btn = 'inline-flex min-h-8 min-w-8 items-center justify-center text-quiet transition-colors hover:text-paper sm:min-h-10 sm:min-w-10'

export default function QuoteDetailMedia({ quote, share, alt, priority }) {
  const shareProps = useShareProps(share, quote)
  const canPrint = appConfig.features.enablePrintShop && isPrintableQuote(quote)

  return (
    <div className="quote-detail-media">
      <QuoteImage
        src={quote.src}
        alt={alt}
        priority={priority}
        variant="detail"
        className="h-auto w-full"
      />
      <div className="mt-4 flex flex-nowrap items-center justify-center gap-1.5 sm:gap-4">
        <QuoteShareRail {...shareProps} layout="row" showSocial={false} />
        {canPrint ? (
          <Link href={printHref(quote.slug)} className={btn} aria-label="Print">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
              <path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M6 14h12v7H6z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        ) : null}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-line pt-4">
        <p className="font-display text-xl text-paper">#{quote.n}</p>
        {quote.tags?.map((t) => (
          <Link key={t} href={quotesHref({ tag: t })} className="tag">
            {formatTag(t)}
          </Link>
        ))}
      </div>
    </div>
  )
}
