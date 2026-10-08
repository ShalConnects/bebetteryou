import Image from 'next/image'
import Link from 'next/link'
import { bookCover, bookRel, bookUrl } from '@/config/books'
import { previewCopy as c } from '@/config/preview'
import { postHref } from '@/libs/blog-url'

/** Notes + one book in a single row, instead of two thin sections. */
export default function ReadDeeper({ posts, book }) {
  const bookLink = book ? bookUrl(book) : ''
  if (!posts.length && !bookLink) return null
  const cover = book ? bookCover(book) : ''

  return (
    <section className="border-t border-line">
      <div className="section">
        <div className="shell-inner">
          <div className="mb-8 flex items-baseline justify-between gap-4">
            <h2 className="heading-sm">{c.readLabel}</h2>
            <span className="flex gap-6">
              {posts.length ? (
                <Link href="/blog" className="nav-link">
                  All notes
                </Link>
              ) : null}
              {bookLink ? (
                <Link href="/books" className="nav-link">
                  All books
                </Link>
              ) : null}
            </span>
          </div>

          <ul className="grid gap-4 md:grid-cols-3">
            {posts.map((post) => (
              <li key={post.slug}>
                <Link href={postHref(post.slug)} className="pv-tile group">
                  <span className="text-[11px] uppercase tracking-[0.2em] text-accent">Note</span>
                  <h3 className="mt-3 font-display text-xl tracking-wide text-paper">{post.title}</h3>
                  {post.excerpt ? <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-body/70">{post.excerpt}</p> : null}
                  <span className="mt-auto pt-6 text-sm text-quiet transition-colors group-hover:text-accent">Read →</span>
                </Link>
              </li>
            ))}
            {bookLink ? (
              <li>
                <a href={bookLink} target="_blank" rel={bookRel} className="pv-tile group">
                  <span className="text-[11px] uppercase tracking-[0.2em] text-accent">Book</span>
                  <span className="mt-3 flex gap-4">
                    {cover ? (
                      <span className="relative block aspect-[2/3] w-16 shrink-0 overflow-hidden bg-ink">
                        <Image src={cover} alt="" fill sizes="64px" className="object-cover" />
                      </span>
                    ) : null}
                    <span className="min-w-0">
                      <h3 className="font-display text-xl tracking-wide text-paper">{book.title}</h3>
                      {book.author ? <p className="mt-1 text-sm text-quiet">{book.author}</p> : null}
                    </span>
                  </span>
                  <span className="mt-auto pt-6 text-sm text-quiet transition-colors group-hover:text-accent">
                    {book.price || 'View on Amazon'} →
                  </span>
                </a>
              </li>
            ) : null}
          </ul>
        </div>
      </div>
    </section>
  )
}
