'use client'

import Link from 'next/link'
import QuoteShareRail, { useShareProps } from '@/components/site/QuoteShare'
import { RelatedBooks, RelatedPosts } from '@/components/site/RelatedContent'
import TraditionPassage from '@/components/site/TraditionPassage'

export default function QuoteAside({ quote, prev, next, share, books = [], posts = [] }) {
  const theme = quote.theme
  const shareProps = useShareProps(share, quote)

  return (
    <aside className="quote-aside" aria-label="Quote details">
      <QuoteShareRail {...shareProps} layout="row" showActions={false} />
      <TraditionPassage tags={quote.tags} slug={quote.slug} n={quote.n} theme={theme} />
      <RelatedPosts posts={posts} />
      <RelatedBooks books={books} />
      <nav className="flex justify-between border-t border-line pt-5 text-[11px] uppercase tracking-[0.2em] text-quiet">
        {prev ? (
          <Link href={`/quotes/${prev.slug}`} className="inline-flex min-h-10 items-center hover:text-paper">
            ← #{prev.n}
          </Link>
        ) : (
          <span />
        )}
        <Link href="/quotes" className="inline-flex min-h-10 items-center hover:text-paper">
          All
        </Link>
        {next ? (
          <Link href={`/quotes/${next.slug}`} className="inline-flex min-h-10 items-center hover:text-paper">
            #{next.n} →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </aside>
  )
}
