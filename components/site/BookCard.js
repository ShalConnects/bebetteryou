import { bookRel, bookUrl } from '@/config/books'

/** Fixed 4:5 catalog tile — matches quote card proportions; text clamps inside. */
export default function BookCard({ book }) {
  const href = bookUrl(book)
  if (!href) return null

  return (
    <a
      href={href}
      target="_blank"
      rel={bookRel}
      className="group flex aspect-[4/5] flex-col overflow-hidden bg-ink p-5 transition-colors hover:bg-ink-soft"
    >
      <h2 className="line-clamp-2 shrink-0 text-lg leading-snug text-paper transition-opacity group-hover:opacity-70">
        {book.title}
      </h2>
      {book.author ? <p className="mt-1 shrink-0 text-sm text-quiet">{book.author}</p> : null}
      {book.blurb ? <p className="mt-3 line-clamp-5 text-sm text-body/70">{book.blurb}</p> : null}
      <p className="mt-auto pt-4 shrink-0 text-sm text-accent">
        {book.price || 'View on Amazon'}
        {book.priceWas ? (
          <span className="ml-2 text-quiet line-through">{book.priceWas}</span>
        ) : null}
      </p>
    </a>
  )
}
