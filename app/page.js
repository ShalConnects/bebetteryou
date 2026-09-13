import Hero from '@/components/Hero'
import NewsletterForm from '@/components/site/NewsletterForm'
import { QuoteGrid, TextLink, ViewMore } from '@/components/site/ui'
import { copy } from '@/config/site'
import { homeQuoteCount, listMoodIntents, listQuotes } from '@/libs/content'
import { sample } from '@/libs/sample'

export default async function Home() {
  const all = await listQuotes()
  /** Keep `text` so QuoteCard can offer Print (isPrintableQuote). */
  const pool = all.map(({ slug, n, src, tags, text, author, theme }) => ({
    slug,
    n,
    src,
    tags,
    text,
    author,
    theme,
  }))
  const quotes = sample(pool, homeQuoteCount)
  const moods = await listMoodIntents()

  return (
    <>
      <Hero quotes={pool} />

      <section className="border-t border-line">
        <div className="section pb-8 pt-14 md:pb-10 md:pt-16">
          <div className="shell-inner">
            <p className="label">Quotes</p>
            <QuoteGrid items={quotes} priorityCount={3} />
            <ViewMore href="/quotes" />
          </div>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="section">
          <div className="shell-inner mx-auto max-w-xl text-center">
            <h2 className="heading-sm">{copy.newsletterTitle}</h2>
            <p className="lede mx-auto">{copy.newsletterSub}</p>
            <NewsletterForm quotes={pool} moods={moods} />
          </div>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="section">
          <div className="shell-inner mx-auto max-w-2xl text-center">
            <p className="text-base text-body/80 md:text-lg">{copy.aboutTeaser}</p>
            <p className="mt-8">
              <TextLink href="/about">About</TextLink>
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
