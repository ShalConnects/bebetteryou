import Image from 'next/image'
import Link from 'next/link'
import Hero from '@/components/Hero'
import NewsletterForm from '@/components/site/NewsletterForm'
import { BookList, QuoteGrid, TextLink, ViewMore } from '@/components/site/ui'
import { appConfig } from '@/config/app'
import { copy, shop } from '@/config/site'
import { listPosts } from '@/libs/blog'
import { postHref } from '@/libs/blog-url'
import { withBookPrices } from '@/libs/book-prices'
import { listBooks } from '@/libs/books'
import { booksHref } from '@/libs/books-url'
import { homeQuoteCount, listMoodIntents, listQuotes } from '@/libs/content'
import { sample } from '@/libs/sample'

const HOME_BLOG_COUNT = 3
const HOME_BOOK_COUNT = 3

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

  const posts =
    appConfig.features.enableBlog ? listPosts().slice(0, HOME_BLOG_COUNT) : []
  const books = appConfig.features.enableBooks
    ? await withBookPrices(sample(listBooks(), HOME_BOOK_COUNT))
    : []
  const printLive = appConfig.features.enablePrintShop
  const shopHref = printLive ? '/shop' : shop.url || ''
  const showShop = Boolean(shopHref)

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

      {posts.length ? (
        <section className="border-t border-line">
          <div className="section">
            <div className="shell-inner">
              <p className="label">{copy.homeBlogLabel}</p>
              <ul className="grid grid-cols-1 gap-8 min-[400px]:grid-cols-2 md:grid-cols-3 md:gap-10">
                {posts.map((post) => (
                  <li key={post.slug}>
                    <Link href={postHref(post.slug)} className="group block h-full">
                      <time className="text-[11px] uppercase tracking-[0.2em] text-quiet">
                        {post.date}
                      </time>
                      <h2 className="mt-2 text-lg text-paper transition-opacity group-hover:opacity-70">
                        {post.title}
                      </h2>
                      {post.excerpt ? (
                        <p className="mt-2 text-sm leading-relaxed text-body/70">{post.excerpt}</p>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
              <ViewMore href="/blog" label="All notes" />
            </div>
          </div>
        </section>
      ) : null}

      {books.length ? (
        <section className="border-t border-line">
          <div className="section">
            <div className="shell-inner">
              <p className="label">{copy.homeBooksLabel}</p>
              <BookList items={books} />
              <ViewMore href={booksHref()} label="All books" />
            </div>
          </div>
        </section>
      ) : null}

      {showShop ? (
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
                {printLive ? (
                  <Link href={shopHref} className="btn">
                    {copy.homePrintCta}
                  </Link>
                ) : (
                  <a href={shopHref} target="_blank" rel="noopener noreferrer" className="btn">
                    {copy.homePrintCta}
                  </a>
                )}
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
