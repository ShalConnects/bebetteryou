import Link from 'next/link'
import { affiliateDisclosure, bookUrl } from '@/config/books'
import { booksHref } from '@/libs/books-url'
import { postHref } from '@/libs/blog-url'

/** Shared related-books rail for quote + blog pages. */
export function RelatedBooks({ books }) {
  if (!books?.length) return null
  return (
    <nav className="border-t border-line pt-5" aria-label="Related books">
      <p className="text-[11px] uppercase tracking-[0.2em] text-quiet">Related books</p>
      <ul className="mt-4 space-y-3">
        {books.map((book) => {
          const href = bookUrl(book)
          return (
            <li key={book.slug}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="text-body/85 transition-colors hover:text-paper"
              >
                <span className="text-paper">{book.title}</span>
                {book.author ? <span className="text-quiet"> — {book.author}</span> : null}
              </a>
              {book.blurb ? <p className="mt-1 text-sm text-body/60">{book.blurb}</p> : null}
            </li>
          )
        })}
      </ul>
      <p className="mt-4 text-xs text-quiet/70">{affiliateDisclosure}</p>
      <p className="mt-2">
        <Link href={booksHref()} className="tag">
          All books
        </Link>
      </p>
    </nav>
  )
}

/** Soft/hard related blog posts on a quote page. */
export function RelatedPosts({ posts }) {
  if (!posts?.length) return null
  return (
    <nav className="border-t border-line pt-5" aria-label="Related posts">
      <p className="text-[11px] uppercase tracking-[0.2em] text-quiet">Notes on this theme</p>
      <ul className="mt-4 space-y-3">
        {posts.map((post) => (
          <li key={post.slug}>
            <Link href={postHref(post.slug)} className="text-body/85 transition-colors hover:text-paper">
              {post.title}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
