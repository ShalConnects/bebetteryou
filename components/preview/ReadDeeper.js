import Link from 'next/link'
import { previewCopy as c, pv } from '@/config/preview'
import BookTile from './BookTile'
import PostTile from './PostTile'
import SectionHead from './SectionHead'

/** Notes + one book in a single row, instead of two thin sections. */
export default function ReadDeeper({ posts, book }) {
  if (!posts.length && !book) return null
  return (
    <section className="border-t border-line">
      <div className="section">
        <div className="shell-inner">
          <SectionHead title={c.readLabel}>
            {posts.length ? (
              <Link href={pv('/blog')} className="nav-link">
                All notes
              </Link>
            ) : null}
            {book ? (
              <Link href={pv('/books')} className="nav-link">
                All books
              </Link>
            ) : null}
          </SectionHead>
          <ul className="grid gap-4 md:grid-cols-3">
            {posts.map((post) => (
              <li key={post.slug}>
                <PostTile post={post} />
              </li>
            ))}
            {book ? (
              <li>
                <BookTile book={book} />
              </li>
            ) : null}
          </ul>
        </div>
      </div>
    </section>
  )
}
