'use client'

import Link from 'next/link'
import { printHref } from '@/libs/print-link'
import ProductMock, { money, productById } from './ProductMock'
import ProductPicker, { useProductPick } from './ProductPicker'

/** Shop: every printable quote, already on the product — one picker drives the grid. */
export default function ShopGrid({ items }) {
  const pick = useProductPick()
  const price = money(productById(pick.productId).retail)
  return (
    <>
      <ProductPicker {...pick} className="mb-10" />
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
        {items.map((q) => (
          <li key={q.slug}>
            <Link href={printHref(q.slug, { productId: pick.productId })} className="group block">
              <ProductMock
                quote={q}
                productId={pick.productId}
                colorId={pick.colorId}
                className="w-full transition-transform group-hover:-translate-y-1"
              />
              <p className="mt-3 flex justify-between text-sm">
                <span className="font-display text-quiet">#{q.n}</span>
                <span className="text-paper">{price}</span>
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
