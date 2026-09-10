import { NextResponse } from 'next/server'
import { appConfig } from '@/config/app'
import { resolveSelection } from '@/config/print-products'
import { handleApiError } from '@/libs/api'
import { guard } from '@/libs/api-guard'
import { withApiLogging } from '@/libs/api-middleware'
import { absolutePrintUrl, resolvePrintableQuote, printFileForSelection } from '@/libs/print-file'
import { printDesignSchema } from '@/libs/validation-schemas'

/**
 * @swagger
 * /api/print/design:
 *   post:
 *     summary: Render the print-ready artwork for a quote on a product
 *     tags: [Print]
 *     responses:
 *       200:
 *         description: Permanent print file URL
 */
async function handlePost(request) {
  try {
    const checked = await guard(request, {
      schema: printDesignSchema,
      enabled: appConfig.features.enablePrintShop,
    })
    if (checked instanceof NextResponse) return checked

    const { slug, productId, color, size, style, leading, scale, credit, text, author } = checked.data
    const quote = await resolvePrintableQuote({ slug, text, author })
    if (!quote) return NextResponse.json({ error: 'That quote cannot be printed' }, { status: 404 })

    // Placement is not read here: front and back share one print file, so it
    // would only add cache keys for identical artwork.
    const selection = resolveSelection({ productId, color, size })
    if (!selection) return NextResponse.json({ error: 'Unknown product or color' }, { status: 400 })

    // Site-relative on purpose: this url is only for the browser preview.
    const url = await printFileForSelection({ quote, selection, style, leading, scale, credit })

    // Placement lives in the catalog, which the client already holds — only the art is news.
    return NextResponse.json({ url })
  } catch (error) {
    return handleApiError(error)
  }
}

export const POST = withApiLogging(handlePost)
