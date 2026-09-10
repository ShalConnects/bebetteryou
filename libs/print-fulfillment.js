import { getPrintProduct } from '@/config/print-products'
import { logError, logInfo } from './logger'
import { advanceOrder, findOrder } from './print-orders'
import { isHandedOff } from './print-status'
import { createOrder, printfulOrderPayload } from './printful'

/**
 * Hand a paid order to Printful. Idempotent and non-throwing so a webhook retry
 * or an admin retry can call it freely. A failure parks the order at
 * `submit_failed` for the dashboard to retry — it never auto-refunds.
 */
export async function submitOrderToPrintful(orderNumber) {
  const order = await findOrder(orderNumber)
  if (!order) return { ok: false, reason: 'not_found' }
  if (isHandedOff(order.status)) return { ok: true, reason: 'already_submitted' }
  if (order.status !== 'paid' && order.status !== 'submit_failed') {
    return { ok: false, reason: `not_payable_from_${order.status}` }
  }
  if (!order.variantId) {
    await advanceOrder(order.orderNumber, 'submit_failed', {
      failureReason: 'Missing Printful variant id — set real ids in config/print-products.js',
    })
    return { ok: false, reason: 'missing_variant' }
  }

  const product = getPrintProduct(order.productId)

  try {
    const payload = printfulOrderPayload({
      orderNumber: order.orderNumber,
      customer: order.customer,
      items: [
        {
          variantId: order.variantId,
          quantity: order.quantity,
          retailPrice: order.retailPrice,
          printFileUrl: order.printFileUrl,
          // The order is the record of what was bought; the catalog only covers
          // rows written before placement was a choice.
          placement: order.placement || product?.placements?.[0]?.id || 'front',
        },
      ],
    })

    const result = await createOrder(payload)
    await advanceOrder(order.orderNumber, 'submitted', {
      printfulOrderId: String(result?.id ?? ''),
      failureReason: null,
    })
    logInfo('Print order submitted to Printful', { orderNumber: order.orderNumber })
    return { ok: true }
  } catch (error) {
    logError('Print order submission failed', error, { orderNumber: order.orderNumber })
    await advanceOrder(order.orderNumber, 'submit_failed', {
      failureReason: error.message?.slice(0, 500) || 'Unknown error',
    }).catch(() => {})
    return { ok: false, reason: 'printful_error' }
  }
}
