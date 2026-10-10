import Link from 'next/link'
import ScrollLink from '@/components/site/ScrollLink'
import BookTile from '@/components/site/BookTile'
import PostTile from '@/components/site/PostTile'
import QuoteCard from '@/components/site/QuoteCard'
import { pageRange, pageWindow } from '@/libs/paging'

export function PageIntro({ title, children, center, aside, srTitle = 'Page' }) {
  return (
    <header
      className={`${aside ? 'mb-4 flex flex-col items-center gap-4 text-center md:flex-row md:items-end md:justify-between md:gap-6 md:text-left' : 'mb-10'} ${center ? 'text-center' : ''}`}
    >
      <div className={aside ? 'min-w-0' : undefined}>
        {title ? <h1 className="heading">{title}</h1> : <h1 className="sr-only">{srTitle}</h1>}
        {children ? (
          <p className={aside ? 'lede-inline' : `lede ${center ? 'mx-auto' : ''}`}>{children}</p>
        ) : null}
      </div>
      {aside}
    </header>
  )
}

export function Page({ as: Tag = 'div', children, className = '', narrow = false }) {
  return (
    <Tag className="page">
      <div className={`shell-inner flex w-full flex-1 flex-col ${narrow ? 'max-w-xl' : ''} ${className}`}>
        {children}
      </div>
    </Tag>
  )
}

export function LegalPage({ title, children }) {
  return (
    <Page>
      <PageIntro title={title} />
      <div className="legal max-w-2xl">{children}</div>
    </Page>
  )
}

export function TextLink({ href, children, className = '' }) {
  return (
    <Link href={href} className={`nav-link ${className}`}>
      {children}
    </Link>
  )
}

/** `href(page)` keeps the pager route-agnostic (quotes, blog, …). */
export function Pager({ page, pages, href, total, pageSize }) {
  const range = pageRange(page, pageSize, total)
  const summary = range ? (
    <p className="text-sm text-quiet">
      {range.start}–{range.end} of {range.total}
    </p>
  ) : null

  if (pages <= 1) {
    return summary ? <div className="mt-12 text-center">{summary}</div> : null
  }

  const edge = (target, label, enabled, hideSm) =>
    enabled ? (
      <ScrollLink href={href(target)} className={`tag${hideSm ? ' hidden sm:inline-flex' : ''}`}>
        {label}
      </ScrollLink>
    ) : (
      <span className={`tag opacity-40${hideSm ? ' hidden sm:inline-flex' : ''}`}>{label}</span>
    )

  return (
    <nav className="mt-12 flex flex-col items-center gap-4" aria-label="Pagination">
      {summary}
      <div className="flex flex-wrap items-center justify-center gap-4">
        {edge(1, 'First', page > 1, true)}
        {edge(page - 1, 'Prev', page > 1)}
        {pageWindow(page, pages).map((item, i) =>
          item === '…' ? (
            <span key={`e${i}`} className="tag hidden opacity-40 sm:inline-flex" aria-hidden>
              …
            </span>
          ) : (
            <ScrollLink
              key={item}
              href={href(item)}
              className={`${item === page ? 'tag-active' : 'tag'} hidden sm:inline-flex`}
              aria-current={item === page ? 'page' : undefined}
            >
              {item}
            </ScrollLink>
          )
        )}
        <span className="tag sm:hidden">
          {page} / {pages}
        </span>
        {edge(page + 1, 'Next', page < pages)}
        {edge(pages, 'Last', page < pages, true)}
      </div>
    </nav>
  )
}

/** `view` (tilted | straight) lays cards on the table — 2 / 3 columns, numbered; classic or none = the plain grid. */
export function QuoteGrid({ items, priorityCount = 0, view }) {
  if (!items.length) return <p className="text-center text-quiet">No quotes yet.</p>
  const table = view === 'tilted' || view === 'straight'
  return (
    <div
      className={
        table
          ? 'grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-8'
          : 'grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 md:grid-cols-3 md:gap-4'
      }
    >
      {items.map((quote, i) =>
        table ? (
          <div key={quote.slug}>
            <QuoteCard
              quote={quote}
              priority={i < priorityCount}
              className={`tilt-cover ${view === 'straight' ? 'rotate-0' : i % 2 ? 'rotate-2' : ''}`}
            />
            <p className="mt-3 font-display text-sm text-quiet">#{quote.n}</p>
          </div>
        ) : (
          <QuoteCard key={quote.slug} quote={quote} priority={i < priorityCount} />
        )
      )}
    </div>
  )
}

/** /books: tiles in a 1 / 2 / 3 column grid. */
export function BookGrid({ items }) {
  if (!items.length) return <p className="text-center text-quiet">No books yet.</p>
  return (
    <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {items.map((book) => (
        <li key={book.slug}>
          <BookTile book={book} />
        </li>
      ))}
    </ul>
  )
}

/** Blog grid: first tile spans the row when `featured`; `cards[i]` / `minutes[i]` pair with `posts[i]`. */
export function BlogList({ posts, cards = [], minutes = [], featured = false }) {
  if (!posts.length) return <p className="text-center text-quiet">No posts yet.</p>
  return (
    <ul className="grid gap-4 md:grid-cols-3">
      {posts.map((post, i) => (
        <li key={post.slug} className={featured && i === 0 ? 'md:col-span-3' : undefined}>
          <PostTile post={post} card={cards[i]} minutes={minutes[i]} featured={featured && i === 0} />
        </li>
      ))}
    </ul>
  )
}
