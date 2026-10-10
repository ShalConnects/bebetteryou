'use client'

import Link from 'next/link'
import { copy as c } from '@/config/site'
import { printHref } from '@/libs/print-link'
import ProductMock from './ProductMock'
import ProductPicker, { useProductPick } from './ProductPicker'

/** Home: the newest printable card, dressed on a tee or mug. */
export default function WearIt({ quote }) {
  const pick = useProductPick()

  return (
    <section id="wear" className="scroll-mt-20 border-t border-line">
      <div className="section">
        <div className="shell-inner grid items-center gap-10 md:grid-cols-2 md:gap-16">
          <ProductMock
            quote={quote}
            productId={pick.productId}
            colorId={pick.colorId}
            className="mx-auto w-full max-w-md"
          />
          <div className="text-center md:text-left">
            <p className="kicker">{c.wearKicker}</p>
            <h2 className="mt-4 font-display text-3xl tracking-wide text-paper md:text-5xl">
              {c.wearTitle[pick.productId]}
            </h2>
            <p className="lede mx-auto md:mx-0">{c.wearSub}</p>
            <ProductPicker {...pick} className="mt-8 justify-center md:justify-start" />
            <p className="mt-10">
              <Link href={printHref(quote.slug, { productId: pick.productId })} className="btn-solid">
                {c.wearCta}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
