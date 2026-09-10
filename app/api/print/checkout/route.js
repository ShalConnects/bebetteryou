import { NextResponse } from 'next/server'
import { appConfig } from '@/config/app'
import { resolveSelection } from '@/config/print-products'
import { resolvePrintLook } from '@/config/print-styles'
import { handleApiError } from '@/libs/api'
import { guard } from '@/libs/api-guard'
import { withApiLogging } from '@/libs/api-middleware'
import { sendPrintOrderEmail } from '@/libs/print-email'
import { absolutePrintUrl, resolvePrintableQuote, printFileForSelection } from '@/libs/print-file'
import { createDraftOrder, printOrdersReady } from '@/libs/print-orders'
import { createPaymentIntent, paymentProviderId } from '@/libs/print-payment'
import { priceSelection } from '@/libs/print-pricing'
import { printCheckoutSchema } from '@/libs/validation-schemas'
import { rateLimitPresets } from '@/libs/rate-limit'

/**
 * @swagger
 * /api/print/checkout:
 *   post:
 *     summary: Persist a print order, then hand off to the payment provider
 *     tags: [Print]
 *     responses:
 *       200:
 *         description: Order saved; `coming_soon` when payment is not wired
 *       503:
 *         description: Order store is not configured
 */
async function handlePost(request) {
  try {
    const checked = await guard(request, {
      schema: printCheckoutSchema,
      preset: rateLimitPresets.strict,
      enabled: appConfig.features.enablePrintShop,
    })
    if (checked instanceof NextResponse) return checked

    if (!printOrdersReady()) {
      return NextResponse.json({ error: 'Ordering is not configured' }, { status: 503 })
    }

    const { slug, productId, color, size, quantity, address, style, leading, scale, credit, placement, text, author } =
      checked.data
    const selection = resolveSelection({ productId, color, size, placement })
    if (!selection) return NextResponse.json({ error: 'Unknown product selection' }, { status: 400 })

    const quote = await resolvePrintableQuote({ slug, text, author })
    if (!quote) return NextResponse.json({ error: 'That quote cannot be printed' }, { status: 404 })

    // Stored absolute: Printful fetches this when the item enters production,
    // which can be days after checkout.
    const printFileUrl = absolutePrintUrl(
      await printFileForSelection({ quote, selection, style, leading, scale, credit })
    )

    const price = await priceSelection({ selection, quantity, address, printFileUrl })

    // A live processor must never charge a total that is missing shipping and tax.
    // The `none` provider takes no money, so it is allowed through unpriced.
    if (!price.estimated && paymentProviderId() !== 'none') {
      return NextResponse.json(
        { error: 'Could not price shipping for this address. Please try again.' },
        { status: 502 }
      )
    }

    const look = resolvePrintLook({ style, leading, scale, credit })

    // Recorded before any payment call so a charge can never exist without an order.
    const order = await createDraftOrder({
      quoteSlug: slug,
      productId,
      variantId: selection.variantId,
      color,
      size,
      placement: selection.placement.id,
      style: look.type.id,
      leading: look.lead.id,
      scale: look.scale.id,
      credit: look.credit.id,
      quantity,
      printFileUrl,
      retailPrice: selection.retail,
      shippingPrice: price.shipping,
      taxAmount: price.tax,
      currency: price.currency,
      customer: address,
      paymentProvider: paymentProviderId(),
    })

    const payment = await createPaymentIntent(order)

    // Best-effort, and deliberately after the payment hand-off so a mail outage
    // cannot cost us the order.
    await sendPrintOrderEmail(order, { total: price.total, message: payment.message })

    return NextResponse.json({ orderNumber: order.orderNumber, price, ...payment })
  } catch (error) {
    return handleApiError(error)
  }
}

export const POST = withApiLogging(handlePost, { logRequestBody: false, logResponseBody: false })
