import { logInfo } from './logger'
import { advanceOrder, findOrder } from './print-orders'

/**
 * Payment seam. No processor is wired yet, so `none` is the only implementation:
 * it parks the order at `awaiting_payment` and reports back that checkout is not
 * open. Add a provider here (and its key to env.example) when one is available —
 * nothing else in the print flow needs to change.
 */
const providers = {
  none: async (order) => {
    await advanceOrder(order.orderNumber, 'awaiting_payment')
    logInfo('Print checkout parked — no payment provider configured', {
      orderNumber: order.orderNumber,
    })
    return {
      status: 'coming_soon',
      message: 'Checkout is opening soon. Your design is saved.',
    }
  },
}

export function paymentProviderId() {
  return process.env.PRINT_PAYMENT_PROVIDER || 'none'
}

export async function createPaymentIntent(order) {
  const id = paymentProviderId()
  const provider = providers[id]
  if (!provider) throw new Error(`Unknown PRINT_PAYMENT_PROVIDER: ${id}`)
  return provider(order)
}

/**
 * Manual collection for the `none` provider. A live processor records `paid`
 * itself; this must not impersonate that.
 */
export async function markOrderPaid(orderNumber) {
  const order = await findOrder(orderNumber)
  if (!order) return { ok: false, reason: 'not_found' }
  if ((order.paymentProvider || 'none') !== 'none') {
    return { ok: false, reason: 'provider_collects' }
  }
  try {
    await advanceOrder(orderNumber, 'paid')
    return { ok: true, status: 'paid' }
  } catch (error) {
    return { ok: false, reason: error.transition ? error.message : 'failed' }
  }
}
