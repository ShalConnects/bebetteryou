'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { previewCopy as c } from '@/config/preview'
import { publicPrintProducts } from '@/config/print-products'
import { printHref } from '@/libs/print-link'
import { isPrintableQuote, quoteOneLine } from '@/libs/quote-text'
import { useDeck } from './DeckProvider'

const money = (cents) => `$${Math.round(cents / 100)}`

/**
 * Rough preview only — the real typesetting happens on /print. Text is sized to
 * the print box with container units so it fits any quote length.
 */
export default function WearIt({ fallback }) {
  const { card } = useDeck()
  const [productId, setProductId] = useState('tee')
  const [colorId, setColorId] = useState('black')

  const quote = isPrintableQuote(card) ? card : fallback
  if (!quote) return null

  const product = publicPrintProducts.find((p) => p.id === productId)
  const color = product.colors.find((col) => col.id === colorId) || product.colors[0]
  const frame = product.placements[0].frame
  const text = quoteOneLine(quote.text)
  /** Fill ~60% of the print box (in % of mockup width), never taller than ~2 lines of a short band. */
  const size = Math.min(frame.height / 2.5, Math.sqrt((0.6 * frame.width * frame.height) / (0.575 * text.length)))

  return (
    <section id="wear" className="scroll-mt-20 border-t border-line">
      <div className="section">
        <div className="shell-inner grid items-center gap-10 md:grid-cols-2 md:gap-16">
          <div className="pv-mock relative mx-auto aspect-square w-full max-w-md overflow-hidden">
            <Image src={color.mockup} alt="" fill sizes="(min-width: 768px) 28rem, 90vw" className="object-cover" />
            <div
              key={`${quote.slug}-${productId}`}
              className="pv-ink"
              style={{
                top: `${frame.top}%`,
                left: `${frame.left}%`,
                width: `${frame.width}%`,
                height: `${frame.height}%`,
                color: color.ink,
                fontSize: `${size}cqw`,
              }}
              aria-hidden
            >
              {text}
            </div>
          </div>

          <div className="text-center md:text-left">
            <p className="pv-kicker">{c.wearKicker}</p>
            <h2 className="mt-4 font-display text-3xl tracking-wide text-paper md:text-5xl">{c.wearTitle[product.id]}</h2>
            <p className="lede mx-auto md:mx-0">{c.wearSub}</p>
            {quote !== card ? (
              <p className="mt-3 text-sm text-quiet">That card can’t be printed yet, so here’s #{quote.n}.</p>
            ) : null}

            <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5 md:justify-start">
              {publicPrintProducts.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`pv-chip ${p.id === productId ? 'pv-chip-on' : ''}`}
                  aria-pressed={p.id === productId}
                  onClick={() => setProductId(p.id)}
                >
                  {p.name} · {money(p.retail)}
                </button>
              ))}
              <span className="mx-1 h-6 w-px bg-line" aria-hidden />
              {product.colors.map((col) => (
                <button
                  key={col.id}
                  type="button"
                  className={`pv-swatch ${col.id === color.id ? 'pv-swatch-on' : ''}`}
                  style={{ background: col.id === 'white' ? '#f4f4f4' : '#111' }}
                  aria-label={col.label}
                  aria-pressed={col.id === color.id}
                  onClick={() => setColorId(col.id)}
                />
              ))}
            </div>

            <p className="mt-10">
              <Link href={printHref(quote.slug, { productId })} className="pv-btn">
                {c.wearCta}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
