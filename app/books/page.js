import { notFound } from 'next/navigation'
import FilterMenu from '@/components/site/FilterMenu'
import { Page, PageIntro, Pager } from '@/components/site/ui'
import { appConfig, getUrl } from '@/config/app'
import { affiliateDisclosure, bookRel, booksIntro, bookUrl } from '@/config/books'
import { bookTags, pageBooks } from '@/libs/books'
import { booksHref } from '@/libs/books-url'
import { param } from '@/libs/content'
import { pageRange } from '@/libs/paging'
import { formatTag } from '@/libs/quotes-url'
import { buildMetadata, noIndex } from '@/libs/seo'

export async function generateMetadata({ searchParams }) {
  if (!appConfig.features.enableBooks) return noIndex
  const sp = await searchParams
  const tag = param(sp?.tag)
  const { page, total, pageSize } = pageBooks(tag, param(sp?.page))
  const range = pageRange(page, pageSize, total)
  const url = getUrl(booksHref({ tag, page }))
  return {
    ...buildMetadata({
      title: tag ? `${formatTag(tag)} books` : 'Books',
      description: range
        ? `${booksIntro} Books ${range.start}–${range.end} of ${range.total}.`
        : booksIntro,
      url,
    }),
    alternates: { canonical: url },
  }
}

function BookList({ books }) {
  if (!books.length) return <p className="text-center text-quiet">No books yet.</p>
  return (
    <ul className="divide-y divide-line">
      {books.map((book) => {
        const href = bookUrl(book)
        return (
          <li key={book.slug} className="py-8 first:pt-0 last:pb-0">
            <article>
              <a
                href={href}
                target="_blank"
                rel={bookRel}
                className="group block"
              >
                <h2 className="text-lg text-paper transition-opacity group-hover:opacity-70">
                  {book.title}
                </h2>
                {book.author ? <p className="mt-1 text-sm text-quiet">{book.author}</p> : null}
                {book.blurb ? <p className="mt-2 text-sm text-body/70">{book.blurb}</p> : null}
              </a>
              {book.tags?.length ? (
                <p className="mt-3 flex flex-wrap gap-2">
                  {book.tags.map((t) => (
                    <a key={t} href={booksHref({ tag: t })} className="tag">
                      {formatTag(t)}
                    </a>
                  ))}
                </p>
              ) : null}
            </article>
          </li>
        )
      })}
    </ul>
  )
}

export default async function BooksPage({ searchParams }) {
  if (!appConfig.features.enableBooks) notFound()
  const sp = await searchParams
  const tag = param(sp?.tag)
  const { items, page, pages, total, pageSize } = pageBooks(tag, param(sp?.page))

  return (
    <Page>
      <PageIntro
        title={tag ? formatTag(tag) : undefined}
        srTitle="Books"
        aside={
          <FilterMenu
            label="Tags"
            active={tag}
            options={[
              { label: 'All', href: booksHref() },
              ...bookTags().map((t) => ({ id: t, label: formatTag(t), href: booksHref({ tag: t }) })),
            ]}
          />
        }
      >
        {booksIntro}
      </PageIntro>
      <BookList books={items} />
      {affiliateDisclosure ? <p className="mt-10 text-center text-xs text-quiet">{affiliateDisclosure}</p> : null}
      <Pager
        page={page}
        pages={pages}
        total={total}
        pageSize={pageSize}
        href={(p) => booksHref({ tag, page: p })}
      />
    </Page>
  )
}
