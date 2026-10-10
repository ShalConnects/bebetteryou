import Image from 'next/image'
import Link from 'next/link'
import Hero from '@/components/Hero'
import DeckStrip from '@/components/site/DeckStrip'
import NewsletterForm from '@/components/site/NewsletterForm'
import ReadDeeper from '@/components/site/ReadDeeper'
import WearIt from '@/components/site/WearIt'
import { appConfig } from '@/config/app'
import { practiceCopy, practiceDiscoverable } from '@/config/practice'
import { copy, heroVideo, shop } from '@/config/site'
import { listPosts, readingMinutes } from '@/libs/blog'
import { withBookPrices } from '@/libs/book-prices'
import { listBooks } from '@/libs/books'
import { homeQuoteCount, listMoodIntents, listQuotes } from '@/libs/content'
import { isPrintableQuote } from '@/libs/quote-text'
import { sample } from '@/libs/sample'

const HOME_BLOG_COUNT = 2

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
  const newest = [...pool].sort((a, b) => b.n - a.n)
  const moods = await listMoodIntents()

  const posts = appConfig.features.enableBlog ? listPosts().slice(0, HOME_BLOG_COUNT) : []
  const [book] = appConfig.features.enableBooks ? await withBookPrices(sample(listBooks(), 1)) : []
  const printLive = appConfig.features.enablePrintShop
  const printable = newest.find(isPrintableQuote)

  return (
    <>
      <Hero quotes={pool} moods={moods} video={heroVideo} />

      <DeckStrip items={newest.slice(0, homeQuoteCount)} />
      {printLive && printable ? <WearIt quote={printable} /> : null}
      <ReadDeeper posts={posts} minutes={posts.map(readingMinutes)} book={book} />

      {!printLive && shop.url ? (
        <section className="border-t border-line">
          <div className="section">
            <div className="shell-inner mx-auto max-w-xl text-center">
              <div className="mb-8 flex justify-center" aria-hidden>
                <Image
                  src="/brand/mugtees.png"
                  alt=""
                  width={320}
                  height={320}
                  className="h-48 w-48 object-contain sm:h-56 sm:w-56 md:h-64 md:w-64"
                  priority={false}
                />
              </div>
              <h2 className="heading-sm">{copy.homePrintTitle}</h2>
              <p className="lede mx-auto">{copy.homePrintSub}</p>
              <p className="mt-8">
                <a href={shop.url} target="_blank" rel="noopener noreferrer" className="btn">
                  {copy.homePrintCta}
                </a>
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {appConfig.features.enablePractice && practiceDiscoverable ? (
        <section className="border-t border-line">
          <div className="section">
            <div className="shell-inner mx-auto max-w-xl text-center">
              <h2 className="heading-sm">{practiceCopy.homeCtaTitle}</h2>
              <p className="lede mx-auto">{practiceCopy.homeCtaSub}</p>
              <p className="mt-8">
                <Link href="/practice" className="btn">
                  {practiceCopy.homeCta}
                </Link>
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="border-t border-line">
        <div className="section">
          <div className="shell-inner mx-auto max-w-xl text-center">
            <h2 className="heading-sm">{copy.newsletterTitle}</h2>
            <p className="lede mx-auto">{copy.newsletterSub}</p>
            <NewsletterForm />
          </div>
        </div>
      </section>
    </>
  )
}
