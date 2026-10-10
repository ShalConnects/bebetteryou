import Link from 'next/link'
import { copy } from '@/config/site'
import BookTile from './BookTile'
import PostTile from './PostTile'
import SectionHead from './SectionHead'

/** Notes + one book in a single row. `minutes[i]` pairs with `posts[i]`. */
export default function ReadDeeper({ posts, minutes = [], book }) {
  if (!posts.length && !book) return null
  return (
    <section className="border-t border-line">
      <div className="section">
        <div className="shell-inner">
          <SectionHead title={copy.homeReadTitle}>
            {posts.length ? (
              <Link href="/blog" className="nav-link">
                All notes
              </Link>
            ) : null}
            {book ? (
              <Link href="/books" className="nav-link">
                All books
              </Link>
            ) : null}
          </SectionHead>
          <ul className="grid gap-4 md:grid-cols-3">
            {posts.map((post, i) => (
              <li key={post.slug}>
                <PostTile post={post} minutes={minutes[i]} />
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
