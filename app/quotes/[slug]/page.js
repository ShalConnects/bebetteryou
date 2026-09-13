import { getQuote, listQuotes, neighbors } from '@/libs/content'
import { quoteAlt, quoteLabel, quoteOneLine } from '@/libs/quote-text'
import { relatedForQuote } from '@/libs/related'
import { buildMetadata } from '@/libs/seo'
import { appConfig, getUrl } from '@/config/app'
import QuoteAside from '@/components/site/QuoteAside'
import QuoteDetailMedia from '@/components/site/QuoteDetailMedia'
import { Page } from '@/components/site/ui'
import { notFound } from 'next/navigation'

export async function generateStaticParams() {
  return (await listQuotes()).map(({ slug }) => ({ slug }))
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const quote = await getQuote(slug)
  if (!quote) return buildMetadata({ title: 'Quote' })
  return buildMetadata({
    title: `#${quote.n}`,
    description: quoteOneLine(quote.text) || `Quote card #${quote.n}`,
    image: quote.src,
  })
}

export default async function QuotePage({ params }) {
  const { slug } = await params
  const quote = await getQuote(slug)
  if (!quote) notFound()
  const { prev, next } = await neighbors(quote.slug)
  const share = {
    url: getUrl(`/quotes/${quote.slug}`),
    text: quoteLabel(quote),
    image: getUrl(quote.src),
    fileName: `bby${quote.n}.jpg`,
  }
  const related = await relatedForQuote(quote)
  const books = appConfig.features.enableBooks ? related.books : []
  const posts = appConfig.features.enableBlog ? related.posts : []

  return (
    <Page as="article">
      <div className="quote-detail-grid">
        <QuoteDetailMedia quote={quote} share={share} alt={quoteAlt(quote)} priority />
        <QuoteAside
          quote={quote}
          prev={prev}
          next={next}
          share={share}
          books={books}
          posts={posts}
        />
      </div>
    </Page>
  )
}
