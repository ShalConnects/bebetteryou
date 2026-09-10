import { getQuote, listQuotes, neighbors } from '@/libs/content'
import { quoteAlt, quoteLabel, quoteOneLine } from '@/libs/quote-text'
import { buildMetadata } from '@/libs/seo'
import { getUrl } from '@/config/app'
import QuoteAside from '@/components/site/QuoteAside'
import QuoteImage from '@/components/site/QuoteImage'
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

  return (
    <Page as="article">
      <div className="quote-detail-grid">
        <div className="quote-detail-media">
          <QuoteImage
            src={quote.src}
            alt={quoteAlt(quote)}
            priority
            variant="detail"
            className="h-auto w-full"
          />
        </div>
        <QuoteAside quote={quote} prev={prev} next={next} share={share} />
      </div>
    </Page>
  )
}
