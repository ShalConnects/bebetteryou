'use client'

import Link from 'next/link'
import QuoteShareRail from '@/components/site/QuoteShare'
import TraditionPassage from '@/components/site/TraditionPassage'
import { scriptureShareText } from '@/libs/scripture-core'
import { quotesHref, formatTag } from '@/libs/quotes-url'
import { useScriptureQuote } from './TraditionProvider'

export default function QuoteAside({ quote, prev, next, share }) {
  const scripture = useScriptureQuote({ tags: quote.tags, slug: quote.slug, n: quote.n })
  const shareProps = { ...share, text: scriptureShareText(share.text, scripture) }

  return (
    <aside className="quote-aside" aria-label="Quote details">
      <QuoteShareRail {...shareProps} layout="row" />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-5">
        <p className="font-display text-xl text-paper">#{quote.n}</p>
        {quote.tags?.map((t) => (
          <Link key={t} href={quotesHref({ tag: t })} className="tag">
            {formatTag(t)}
          </Link>
        ))}
      </div>
      <TraditionPassage tags={quote.tags} slug={quote.slug} n={quote.n} />
      <nav className="mt-auto flex justify-between border-t border-line pt-5 text-[11px] uppercase tracking-[0.2em] text-quiet">
        {prev ? (
          <Link href={`/quotes/${prev.slug}`} className="hover:text-paper">← #{prev.n}</Link>
        ) : (
          <span />
        )}
        <Link href="/quotes" className="hover:text-paper">All</Link>
        {next ? (
          <Link href={`/quotes/${next.slug}`} className="hover:text-paper">#{next.n} →</Link>
        ) : (
          <span />
        )}
      </nav>
    </aside>
  )
}
