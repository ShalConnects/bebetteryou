import { lineSubtotal, printCurrency } from '@/config/print-products'
import { logError } from './logger'
import { estimateOrderCost, isPrintfulConfigured, printfulOrderPayload } from './printful'

/** Printful returns decimal strings; money stays in cents everywhere else. */
function toCents(value) {
  const amount = Number(value)
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0
}

/**
 * Price a selection server-side. Shipping and tax come from Printful when it is
 * configured; otherwise the caller gets `estimated: false` and must not charge.
 */
export async function priceSelection({ selection, quantity, address, printFileUrl }) {
  const subtotal = lineSubtotal(selection.retail, quantity)
  const base = { currency: printCurrency, subtotal, shipping: 0, tax: 0, total: subtotal }

  if (!isPrintfulConfigured() || !selection.variantId || !address) {
    return { ...base, estimated: false }
  }

  try {
    const costs = await estimateOrderCost(
      printfulOrderPayload({
        customer: address,
        items: [
          {
            variantId: selection.variantId,
            quantity,
            retailPrice: selection.retail,
            printFileUrl,
            placement: selection.placement.id,
          },
        ],
      })
    )

    const shipping = toCents(costs?.costs?.shipping)
    const tax = toCents(costs?.costs?.tax) + toCents(costs?.costs?.vat)
    return { ...base, shipping, tax, total: subtotal + shipping + tax, estimated: true }
  } catch (error) {
    logError('Print cost estimate failed', error)
    return { ...base, estimated: false }
  }
}
