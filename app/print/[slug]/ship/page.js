import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { appConfig } from '@/config/app'
import { blankKey, publicPrintProducts, resolveSelection } from '@/config/print-products'
import { resolvePrintLook } from '@/config/print-styles'
import PrintCheckout from '@/components/site/PrintCheckout'
import { Page, PageIntro } from '@/components/site/ui'
import { resolvePrintableQuote } from '@/libs/print-file'
import { parsePrintParams, printHref } from '@/libs/print-link'
import { formatPrintSelection } from '@/libs/print-format'
import { printBlanks } from '@/libs/printful-catalog'
import { buildMetadata } from '@/libs/seo'

/** A checkout step is worthless in search results and would leak selections. */
export const metadata = {
  ...buildMetadata({ title: 'Shipping' }),
  robots: { index: false, follow: false },
}

export default async function PrintShipPage({ params, searchParams }) {
  if (!appConfig.features.enablePrintShop) notFound()

  const { slug } = await params
  const chosen = parsePrintParams(await searchParams)

  const [quote, blanks] = await Promise.all([
    resolvePrintableQuote({ slug, text: chosen.text, author: chosen.author }),
    printBlanks(),
  ])
  if (!quote) notFound()

  // The catalog is the authority, so a hand-edited or stale url returns to the
  // designer instead of half-rendering an order nobody can fulfil.
  const selection = resolveSelection(chosen)
  if (!selection) redirect(printHref(slug, chosen))

  const product = publicPrintProducts.find((p) => p.id === selection.product.id)
  const swatch = product.colors.find((c) => c.id === selection.color.id)
  const placement = product.placements.find((p) => p.id === selection.placement.id)
  const look = resolvePrintLook(chosen)

  return (
    <Page>
      <PageIntro srTitle="Shipping">
        {formatPrintSelection({
          product,
          swatch,
          size: selection.size,
          placement,
          look,
          quantity: chosen.quantity,
        })}
      </PageIntro>

      <PrintCheckout
        quote={{ slug: quote.slug, n: quote.n, text: quote.text, author: quote.author }}
        product={product}
        swatch={swatch}
        placement={placement}
        blank={blanks[blankKey(product.id, swatch.id, placement.id)] || null}
        selection={{
          productId: product.id,
          color: swatch.id,
          size: selection.size,
          placement: placement.id,
          style: look.type.id,
          leading: look.lead.id,
          scale: look.scale.id,
          credit: look.credit.id,
          quantity: chosen.quantity,
        }}
      />

      <p className="mt-8">
        <Link href={printHref(slug, chosen)} className="note">
          Change the design
        </Link>
      </p>
    </Page>
  )
}
