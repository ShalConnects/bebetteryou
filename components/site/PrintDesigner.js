'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { blankKey, publicPrintProducts } from '@/config/print-products'
import {
  creditForAuthor,
  defaultPrintLeading,
  defaultPrintScale,
  defaultPrintStyle,
  printCredits,
  printLeadings,
  printScales,
  printStyles,
  resolvePrintLook,
} from '@/config/print-styles'
import { Choice, Preview } from '@/components/site/print-ui'
import { usePrintDesign } from '@/components/site/usePrintDesign'
import { formatPrice, formatPrintSelection } from '@/libs/print-format'
import { clampPrintQty, printQuantities, printShipHref } from '@/libs/print-link'

/**
 * Step one: choose what gets printed. Shipping and payment live on their own
 * page, reached through a url that carries this selection.
 */
export default function PrintDesigner({ quote, blanks = {}, productId: requestedId }) {
  // Catalog is imported here, not passed as a server prop: Fast Refresh of this
  // file used to keep the previous RSC payload, which had no `placements` yet.
  const products = publicPrintProducts
  const [productId, setProductId] = useState(
    () => products.find((p) => p.id === requestedId)?.id || products[0]?.id
  )
  const product = useMemo(
    () => products.find((p) => p.id === productId) || products[0],
    [products, productId]
  )

  const [color, setColor] = useState(product.colors[0]?.id)
  const swatch = useMemo(
    () => product.colors.find((c) => c.id === color) || product.colors[0],
    [product.colors, color]
  )
  const [size, setSize] = useState(product.sizes[0])
  const spots = product.placements || []
  const [placementId, setPlacementId] = useState(spots[0]?.id)
  const placement = spots.find((p) => p.id === placementId) || spots[0]
  /** Type outlives a product change; placement cannot, being product-specific. */
  const [style, setStyle] = useState(defaultPrintStyle.id)
  const [leading, setLeading] = useState(defaultPrintLeading.id)
  const [scale, setScale] = useState(defaultPrintScale.id)
  const [credit, setCredit] = useState(() => creditForAuthor(quote.author).id)
  const [quantity, setQuantity] = useState(1)

  // Colour and size belong to the product, so they reset when it changes.
  // Adjusted during render rather than in an effect so the new product never
  // paints with the old product's colour, and keyed on the id because a server
  // refresh hands back a new object for the same product.
  const [lastProductId, setLastProductId] = useState(productId)
  if (lastProductId !== productId) {
    setLastProductId(productId)
    setColor(product.colors[0]?.id)
    setSize(product.sizes[0])
    setPlacementId(product.placements?.[0]?.id)
  }

  const { design, busy, error } = usePrintDesign({
    slug: quote.slug,
    productId: product.id,
    color,
    size: product.printBySize ? size : product.sizes[0],
    style,
    leading,
    scale,
    credit,
    text: quote.text,
    author: quote.author,
  })

  return (
    <div className="grid gap-10 md:grid-cols-2">
      <div className="space-y-4">
        <Preview
          product={product}
          swatch={swatch}
          placement={placement}
          blank={blanks[blankKey(product.id, color, placement?.id)]}
          design={design}
          alt={quote.n ? `Quote #${quote.n} artwork` : 'Your line'}
        />
        <p className="text-sm text-quiet">
          {formatPrintSelection({
            product,
            swatch,
            size,
            placement,
            look: resolvePrintLook({ style, leading, scale, credit }),
            quantity,
          })}
        </p>
        {busy ? <p className="text-sm text-quiet">Rendering…</p> : null}
        <p className="text-sm text-quiet">{product.blurb}</p>
      </div>

      <div className="space-y-6">
        <Choice
          label="Product"
          options={products.map((p) => ({ id: p.id, label: p.name }))}
          value={product.id}
          onChange={setProductId}
        />

        <Choice label="Colour" options={product.colors} value={color} onChange={setColor} />

        {/* A mug has one wrap, so there is nothing to choose. */}
        {spots.length > 1 ? (
          <Choice
            label="Print side"
            options={spots}
            value={placement?.id}
            onChange={setPlacementId}
          />
        ) : null}

        <Choice label="Size" options={product.sizes} value={size} onChange={setSize} />

        <Choice label="Type" options={printStyles} value={style} onChange={setStyle} />

        <Choice label="Type size" options={printScales} value={scale} onChange={setScale} />

        <Choice label="Spacing" options={printLeadings} value={leading} onChange={setLeading} />

        <Choice label="Author" options={printCredits} value={credit} onChange={setCredit} />

        <Choice
          label="Quantity"
          options={printQuantities}
          value={quantity}
          onChange={(n) => setQuantity(clampPrintQty(n))}
        />

        <div className="flex flex-wrap items-center gap-4">
          {/* No art, no order — a combination the renderer refused must not
              travel to the shipping step only to fail again at checkout. */}
          {design && !error && placement ? (
            <Link
              href={printShipHref(quote.slug, {
                productId: product.id,
                color,
                size,
                placement: placement.id,
                style,
                leading,
                scale,
                credit,
                quantity,
                text: quote.text,
                author: quote.author,
              })}
              className="btn"
            >
              Continue to shipping
            </Link>
          ) : (
            <span className="btn opacity-50" aria-disabled="true">
              Continue to shipping
            </span>
          )}
          <span className="text-sm text-quiet">{formatPrice(product.retail)} each</span>
        </div>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}
      </div>
    </div>
  )
}
