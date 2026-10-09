import DealHero from '@/components/preview/DealHero'
import { DeckProvider } from '@/components/preview/DeckProvider'
import DeckStrip from '@/components/preview/DeckStrip'
import ReadDeeper from '@/components/preview/ReadDeeper'
import WearIt from '@/components/preview/WearIt'
import NewsletterForm from '@/components/site/NewsletterForm'
import { appConfig } from '@/config/app'
import { previewCopy as c, previewDeckCount } from '@/config/preview'
import { listPosts } from '@/libs/blog'
import { withBookPrices } from '@/libs/book-prices'
import { listBooks } from '@/libs/books'
import { listMoodIntents, listQuotes } from '@/libs/content'
import { isPrintableQuote } from '@/libs/quote-text'
import { sample } from '@/libs/sample'

/**
 * Redesign trial ("the deck"). Same data as `/`, new layout. Delete
 * `app/preview`, `components/preview` and `config/preview.js` to drop it.
 */

export default async function PreviewHome() {
  const all = await listQuotes()
  const pool = all
    .map(({ slug, n, src, tags, text, author, theme }) => ({
      slug,
      n,
      src,
      tags,
      text,
      author,
      theme,
    }))
    .sort((a, b) => b.n - a.n)
  const [today, yesterday] = pool
  const moods = await listMoodIntents()

  const posts = appConfig.features.enableBlog ? listPosts().slice(0, 2) : []
  const [book] = appConfig.features.enableBooks ? await withBookPrices(sample(listBooks(), 1)) : []
  const showWear = appConfig.features.enablePrintShop
  const printable = pool.find(isPrintableQuote)

  return (
    <DeckProvider initial={today}>
      <DealHero
        quotes={pool}
        moods={moods}
        today={today}
        yesterday={yesterday}
        showWear={showWear && Boolean(printable)}
      />
      <DeckStrip items={pool.slice(0, previewDeckCount)} />
      {showWear ? <WearIt fallback={printable} /> : null}
      <ReadDeeper posts={posts} book={book} />

      <section className="border-t border-line">
        <div className="section">
          <div className="shell-inner mx-auto max-w-xl text-center">
            <h2 className="heading-sm">{c.newsletterTitle}</h2>
            <p className="lede mx-auto">{c.newsletterSub}</p>
            {/* No quotes → no "Surprise Me": the hero already deals cards. */}
            <NewsletterForm quotes={[]} moods={[]} />
          </div>
        </div>
      </section>
    </DeckProvider>
  )
}
