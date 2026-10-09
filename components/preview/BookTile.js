import Image from 'next/image'
import { bookCover, bookRel, bookUrl } from '@/config/books'
import { previewCopy as c, pv } from '@/config/preview'
import TableCard from './TableCard'

/** Book tile: cover face-out, blurb as the takeaway, optional matching card. */
export default function BookTile({ book, card, large = false }) {
  const href = bookUrl(book)
  if (!href) return null
  const cover = bookCover(book)

  return (
    <div className="pv-tile">
      <a href={href} target="_blank" rel={bookRel} className="group flex gap-5">
        {cover ? (
          <span
            className={`pv-card relative block aspect-[2/3] shrink-0 ${large ? 'w-28 md:w-32' : 'w-16'}`}
            style={{ '--tilt': '-2deg' }}
          >
            <Image src={cover} alt={`${book.title} cover`} fill sizes="128px" className="object-cover" />
          </span>
        ) : null}
        <span className="min-w-0">
          <span className="text-[11px] uppercase tracking-[0.2em] text-accent">Book</span>
          <h3 className="mt-2 font-display text-xl tracking-wide text-paper">{book.title}</h3>
          {book.author ? <p className="mt-1 text-sm text-quiet">{book.author}</p> : null}
          {large && book.blurb ? <p className="mt-3 text-sm leading-relaxed text-body/75">{book.blurb}</p> : null}
          <span className="mt-4 block text-sm text-quiet transition-colors group-hover:text-accent">
            {book.price || 'View on Amazon'} →
          </span>
        </span>
      </a>
      {card ? (
        <div className="mt-6 flex items-center gap-4 border-t border-line pt-5">
          <TableCard quote={card} href={pv(`/quotes/${card.slug}`)} className="w-16 shrink-0" />
          <p className="text-[11px] uppercase tracking-[0.2em] text-quiet">
            {c.booksCard} · #{card.n}
          </p>
        </div>
      ) : null}
    </div>
  )
}
