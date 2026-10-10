import Image from 'next/image'
import { bookCover, bookRel, bookUrl } from '@/config/books'

/** Books grid tile — cover face-out, blurb as the takeaway, price/action last. */
export default function BookTile({ book }) {
  const href = bookUrl(book)
  if (!href) return null
  const cover = bookCover(book)

  return (
    <a href={href} target="_blank" rel={bookRel} className="tile group flex gap-5">
      {cover ? (
        <span className="tilt-cover relative block aspect-[2/3] w-28 shrink-0 md:w-32">
          <Image src={cover} alt={`${book.title} cover`} fill sizes="128px" className="object-cover" />
        </span>
      ) : null}
      <span className="min-w-0">
        <span className="text-[11px] uppercase tracking-[0.2em] text-accent">Book</span>
        <h2 className="mt-2 font-display text-xl tracking-wide text-paper">{book.title}</h2>
        {book.author ? <p className="mt-1 text-sm text-quiet">{book.author}</p> : null}
        {book.blurb ? <p className="mt-3 text-sm leading-relaxed text-body/75">{book.blurb}</p> : null}
        <span className="mt-4 block text-sm text-quiet transition-colors group-hover:text-accent">
          {book.price || 'View on Amazon'}
          {book.priceWas ? <span className="ml-2 line-through">{book.priceWas}</span> : null} →
        </span>
      </span>
    </a>
  )
}
