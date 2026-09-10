import { notFound } from 'next/navigation'
import { appConfig } from '@/config/app'
import PrintDesigner from '@/components/site/PrintDesigner'
import { Page, PageIntro } from '@/components/site/ui'
import { resolvePrintableQuote } from '@/libs/print-file'
import { customPrintSlug, parsePrintParams } from '@/libs/print-link'
import { printBlanks } from '@/libs/printful-catalog'
import { quoteOneLine } from '@/libs/quote-text'
import { buildMetadata } from '@/libs/seo'

export async function generateMetadata({ params, searchParams }) {
  const { slug } = await params
  const chosen = parsePrintParams(await searchParams)
  const quote = await resolvePrintableQuote({ slug, text: chosen.text, author: chosen.author })
  if (!quote) return buildMetadata({ title: 'Print' })
  const meta = buildMetadata({
    title: quote.n ? `Print #${quote.n}` : 'Print your line',
    description: quoteOneLine(quote.text) || 'Put your line on a tee or mug.',
    image: quote.src,
  })
  return slug === customPrintSlug ? { ...meta, robots: { index: false, follow: false } } : meta
}

export default async function PrintPage({ params, searchParams }) {
  if (!appConfig.features.enablePrintShop) notFound()

  const { slug } = await params
  const chosen = parsePrintParams(await searchParams)
  const [quote, blanks] = await Promise.all([
    resolvePrintableQuote({ slug, text: chosen.text, author: chosen.author }),
    printBlanks(),
  ])
  if (!quote) notFound()

  return (
    <Page>
      <PageIntro srTitle="Print">
        Printed and shipped when you order. Pick a product and we&apos;ll set the type for you.
      </PageIntro>
      <PrintDesigner
        quote={{ slug: quote.slug, n: quote.n, text: quote.text, author: quote.author }}
        blanks={blanks}
        productId={chosen.productId}
      />
    </Page>
  )
}
