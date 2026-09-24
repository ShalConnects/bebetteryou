import Image from 'next/image'
import Link from 'next/link'
import ScrollLink from '@/components/site/ScrollLink'
import BookCard from '@/components/site/BookCard'
import QuoteCard from '@/components/site/QuoteCard'
import { pageRange, pageWindow } from '@/libs/paging'
import { postHref } from '@/libs/blog-url'

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

export function ViewMore({ href, label = 'View all' }) {
  return (
    <p className="mt-12 text-center">
      <Link href={href} className="btn">
        {label}
      </Link>
    </p>
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

export function QuoteGrid({ items, priorityCount = 0 }) {
  if (!items.length) return <p className="text-center text-quiet">No quotes yet.</p>
  return (
    <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 md:grid-cols-3 md:gap-4">
      {items.map((quote, i) => (
        <QuoteCard key={quote.slug} quote={quote} priority={i < priorityCount} />
      ))}
    </div>
  )
}

export function BookList({ items }) {
  if (!items.length) return <p className="text-center text-quiet">No books yet.</p>
  return (
    <ul className="divide-y divide-line">
      {items.map((book) => (
        <li key={book.slug} className="py-8 first:pt-0 last:pb-0">
          <BookCard book={book} />
        </li>
      ))}
    </ul>
  )
}

export function BlogList({ posts }) {
  if (!posts.length) return <p className="text-center text-quiet">No posts yet.</p>
  return (
    <ul className="divide-y divide-line">
      {posts.map((post) => (
        <li key={post.slug} className="py-8 first:pt-0 last:pb-0">
          <Link
            href={postHref(post.slug)}
            className="group flex items-center justify-between gap-4 sm:gap-6"
          >
            <span className="flex min-w-0 items-center gap-4 sm:gap-6">
              {post.image ? (
                <span className="relative block aspect-[16/9] w-24 shrink-0 overflow-hidden bg-ink sm:w-32">
                  <Image src={post.image} alt="" fill sizes="128px" className="object-cover" />
                </span>
              ) : null}
              <span className="min-w-0">
                <time className="text-[11px] uppercase tracking-[0.2em] text-quiet">{post.date}</time>
                <h2 className="mt-2 text-lg text-paper transition-opacity group-hover:opacity-70">
                  {post.title}
                </h2>
                <p className="mt-2 text-sm text-body/70">{post.excerpt}</p>
              </span>
            </span>
            <span className="shrink-0 text-sm font-semibold text-accent">Read post</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
