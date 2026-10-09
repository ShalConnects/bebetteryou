import { notFound } from 'next/navigation'
import BookTile from '@/components/preview/BookTile'
import Chips, { moodLinks } from '@/components/preview/Chips'
import SectionHead from '@/components/preview/SectionHead'
import { Page } from '@/components/site/ui'
import { appConfig } from '@/config/app'
import { affiliateDisclosure, booksIntro } from '@/config/books'
import { previewCopy as c, pv } from '@/config/preview'
import { withBookPrices } from '@/libs/book-prices'
import { bookTags, listBooks } from '@/libs/books'
import { booksHref } from '@/libs/books-url'
import { listMoodIntents, listQuotes, param } from '@/libs/content'
import { hybridPick } from '@/libs/hybrid-pick'
import { seedFromKey } from '@/libs/scripture-core'

export default async function PreviewBooks({ searchParams }) {
  if (!appConfig.features.enableBooks) notFound()
  const sp = await searchParams
  const tag = param(sp?.tag)
  const [books, moods, pool] = await Promise.all([withBookPrices(listBooks(tag)), listMoodIntents(), listQuotes()])
  /** Same tag join as everywhere else; seeded so a book keeps its card. */
  const cardFor = (b) =>
    hybridPick({
      pool,
      tags: b.tags || [],
      count: 1,
      seed: seedFromKey(b.slug),
    })[0]

  return (
    <Page>
      <SectionHead as="h1" title={c.booksTitle} sub={booksIntro} />
      <Chips
        label="Moods"
        className="mb-10"
        items={moodLinks(moods, bookTags(), tag, (t) => pv(booksHref({ tag: t })))}
      />
      <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {books.map((b) => (
          <li key={b.slug}>
            <BookTile book={b} card={cardFor(b)} large />
          </li>
        ))}
      </ul>
      {affiliateDisclosure ? <p className="mt-10 text-center text-xs text-quiet">{affiliateDisclosure}</p> : null}
    </Page>
  )
}
