import Link from 'next/link'
import { notFound } from 'next/navigation'
import CardActions from '@/components/preview/CardActions'
import Chips from '@/components/preview/Chips'
import DeckStrip from '@/components/site/DeckStrip'
import ProductMock, { money, productById } from '@/components/site/ProductMock'
import Swipe from '@/components/preview/Swipe'
import TableCard from '@/components/site/TableCard'
import { RelatedBooks, RelatedPosts } from '@/components/site/RelatedContent'
import TraditionPassage from '@/components/site/TraditionPassage'
import { appConfig } from '@/config/app'
import { previewCopy as c, pv } from '@/config/preview'
import { getQuote, listQuotes, neighbors } from '@/libs/content'
import { printHref } from '@/libs/print-link'
import { isPrintableQuote, quoteAlt } from '@/libs/quote-text'
import { formatTag, quotesHref } from '@/libs/quotes-url'
import { relatedForQuote } from '@/libs/related'

export default async function PreviewQuote({ params }) {
  const { slug } = await params
  const quote = await getQuote(slug)
  if (!quote) notFound()
  const [{ prev, next }, related, all] = await Promise.all([neighbors(slug), relatedForQuote(quote), listQuotes()])
  const at = (q) => q && pv(`/quotes/${q.slug}`)
  const like = all
    .filter((q) => q.slug !== slug && q.tags?.some((t) => quote.tags?.includes(t)))
    .sort((a, b) => b.n - a.n)
  const wear =
    appConfig.features.enablePrintShop && isPrintableQuote(quote) ? printHref(quote.slug, { productId: 'tee' }) : null

  return (
    <>
      <article className="page overflow-x-clip">
        <h1 className="sr-only">{quoteAlt(quote)}</h1>
        <div className="shell-inner grid gap-12 md:grid-cols-[minmax(0,26rem)_1fr] md:gap-16">
          <div className="pv-table">
            <Swipe prev={at(prev)} next={at(next)}>
              <TableCard quote={quote} variant="detail" priority className="pv-card-deal" />
            </Swipe>
            <CardActions card={quote} wearHref={wear} pool={like.map((q) => q.slug)} className="mt-6" />
          </div>

          <div className="flex min-w-0 flex-col gap-6">
            <Chips
              label="Tags"
              items={(quote.tags || []).map((t) => ({
                key: t,
                label: formatTag(t),
                href: pv(quotesHref({ tag: t })),
              }))}
            />
            {wear ? (
              <Link href={wear} className="tile group">
                <span className="flex flex-col items-start gap-4 lg:flex-row lg:items-center lg:gap-5">
                  <ProductMock quote={quote} className="w-28 shrink-0 md:w-36" />
                  <span>
                    <span className="block font-display text-2xl text-paper">On a tee</span>
                    <span className="mt-1 block text-sm text-quiet transition-colors group-hover:text-accent">
                      {money(productById('tee').retail)} · printed when you order →
                    </span>
                  </span>
                </span>
              </Link>
            ) : null}
            <TraditionPassage tags={quote.tags} slug={quote.slug} n={quote.n} theme={quote.theme} />
            {appConfig.features.enableBlog ? <RelatedPosts posts={related.posts} /> : null}
            {appConfig.features.enableBooks ? <RelatedBooks books={related.books} /> : null}
            <nav className="flex justify-between border-t border-line pt-5">
              {prev ? (
                <Link href={at(prev)} className="nav-link">
                  ← #{prev.n}
                </Link>
              ) : (
                <span />
              )}
              <Link href={pv('/quotes')} className="nav-link">
                All
              </Link>
              {next ? (
                <Link href={at(next)} className="nav-link">
                  #{next.n} →
                </Link>
              ) : (
                <span />
              )}
            </nav>
          </div>
        </div>
      </article>
      <DeckStrip
        items={like.slice(0, 12)}
        title={c.moreLike}
        allHref={pv(quotesHref({ tag: quote.tags?.[0] }))}
        hrefFor={(q) => pv(`/quotes/${q.slug}`)}
      />
    </>
  )
}
