'use client'

import Link from 'next/link'
import { previewCopy as c } from '@/config/preview'
import { printHref } from '@/libs/print-link'
import { isPrintableQuote } from '@/libs/quote-text'
import { useDeck } from './DeckProvider'
import ProductMock from './ProductMock'
import ProductPicker, { useProductPick } from './ProductPicker'

/** Home: the dealt card, dressed on a tee or mug. */
export default function WearIt({ fallback }) {
  const { card } = useDeck()
  const pick = useProductPick()
  const quote = isPrintableQuote(card) ? card : fallback
  if (!quote) return null

  return (
    <section id="wear" className="scroll-mt-20 border-t border-line">
      <div className="section">
        <div className="shell-inner grid items-center gap-10 md:grid-cols-2 md:gap-16">
          <ProductMock quote={quote} productId={pick.productId} colorId={pick.colorId} className="mx-auto w-full max-w-md" />
          <div className="text-center md:text-left">
            <p className="pv-kicker">{c.wearKicker}</p>
            <h2 className="mt-4 font-display text-3xl tracking-wide text-paper md:text-5xl">
              {c.wearTitle[pick.productId]}
            </h2>
            <p className="lede mx-auto md:mx-0">{c.wearSub}</p>
            {quote !== card ? (
              <p className="mt-3 text-sm text-quiet">That card can’t be printed yet, so here’s #{quote.n}.</p>
            ) : null}
            <ProductPicker {...pick} className="mt-8 justify-center md:justify-start" />
            <p className="mt-10">
              <Link href={printHref(quote.slug, { productId: pick.productId })} className="pv-btn">
                {c.wearCta}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
