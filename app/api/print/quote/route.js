import { NextResponse } from 'next/server'
import { appConfig } from '@/config/app'
import { resolveSelection } from '@/config/print-products'
import { handleApiError } from '@/libs/api'
import { guard } from '@/libs/api-guard'
import { withApiLogging } from '@/libs/api-middleware'
import { absolutePrintUrl, resolvePrintableQuote, printFileForSelection } from '@/libs/print-file'
import { priceSelection } from '@/libs/print-pricing'
import { printQuoteSchema } from '@/libs/validation-schemas'

/**
 * @swagger
 * /api/print/quote:
 *   post:
 *     summary: Itemised subtotal, shipping and tax for a print selection
 *     tags: [Print]
 *     responses:
 *       200:
 *         description: Price breakdown in cents
 */
async function handlePost(request) {
  try {
    const checked = await guard(request, {
      schema: printQuoteSchema,
      enabled: appConfig.features.enablePrintShop,
    })
    if (checked instanceof NextResponse) return checked

    const { slug, productId, color, size, quantity, address, style, leading, scale, credit, placement, text, author } =
      checked.data
    const selection = resolveSelection({ productId, color, size, placement })
    if (!selection) return NextResponse.json({ error: 'Unknown product selection' }, { status: 400 })

    const quote = await resolvePrintableQuote({ slug, text, author })
    if (!quote) return NextResponse.json({ error: 'That quote cannot be printed' }, { status: 404 })

    // Printful refuses to estimate an item with no print file, so the artwork
    // has to exist before shipping and tax can be quoted.
    const printFileUrl = absolutePrintUrl(
      await printFileForSelection({ quote, selection, style, leading, scale, credit })
    )

    const price = await priceSelection({ selection, quantity, address, printFileUrl })
    return NextResponse.json(price)
  } catch (error) {
    return handleApiError(error)
  }
}

export const POST = withApiLogging(handlePost)
