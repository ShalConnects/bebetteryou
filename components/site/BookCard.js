import Image from 'next/image'
import { bookCover, bookRel, bookUrl } from '@/config/books'

/** Catalog row — cover left, copy middle, price/action right (matches /shop). */
export default function BookCard({ book }) {
  const href = bookUrl(book)
  if (!href) return null

  const cover = bookCover(book)
  const alt = book.author ? `${book.title} by ${book.author}` : book.title

  return (
    <a
      href={href}
      target="_blank"
      rel={bookRel}
      className="group flex items-center justify-between gap-4 sm:gap-6"
    >
      <span className="flex min-w-0 items-center gap-4">
        <span className="relative block aspect-[2/3] w-14 shrink-0 overflow-hidden bg-ink sm:w-16">
          {cover ? (
            <Image src={cover} alt={alt} fill sizes="64px" className="object-cover" />
          ) : null}
        </span>
        <span className="min-w-0">
          <h2 className="text-lg text-paper transition-opacity group-hover:opacity-70">{book.title}</h2>
          {book.author ? <p className="mt-1 text-sm text-quiet">{book.author}</p> : null}
          {book.blurb ? <p className="mt-2 line-clamp-2 text-sm text-body/70">{book.blurb}</p> : null}
        </span>
      </span>
      <span className="shrink-0 text-sm font-semibold text-accent">
        {book.price || 'View on Amazon'}
        {book.priceWas ? (
          <span className="ml-2 font-normal text-quiet line-through">{book.priceWas}</span>
        ) : null}
      </span>
    </a>
  )
}
