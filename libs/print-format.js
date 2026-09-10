import { resolveSelection } from '@/config/print-products'
import { resolvePrintLook } from '@/config/print-styles'
import { printQuoteHref } from '@/libs/print-link'

/** Cents to a display string. Shared by the storefront and the admin table. */
export function formatPrice(cents, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format((cents || 0) / 100)
}

export function formatStatus(status) {
  return String(status || '').replace(/_/g, ' ')
}

/** Every chosen axis, in designer order, so the shipping step can recap without picking favourites. */
export function formatPrintSelection({ product, swatch, size, placement, look, quantity }) {
  return [
    product?.name,
    swatch?.label,
    size,
    placement?.label,
    look?.type.label,
    look?.scale.label,
    look?.lead.label,
    look?.credit.label,
    `×${quantity}`,
  ]
    .filter(Boolean)
    .join(' · ')
}

/** Catalog labels for a stored order, so the admin table does not re-join raw ids. */
export function formatPrintOrderItem(order) {
  const selection = resolveSelection({
    productId: order.productId,
    color: order.color,
    size: order.size,
    placement: order.placement,
  })
  return formatPrintSelection({
    product: selection?.product || { name: order.productId },
    swatch: selection?.color || { label: order.color },
    size: order.size,
    placement: selection?.placement || { label: order.placement },
    look: resolvePrintLook(order),
    quantity: order.quantity,
  })
}

export function formatPrintLocality(customer) {
  return [customer?.city, customer?.state, customer?.country].filter(Boolean).join(', ')
}

export function formatPrintShipTo(customer) {
  if (!customer) return ''
  return [customer.address1, customer.address2, formatPrintLocality(customer), customer.zip].filter(Boolean).join(' · ')
}

/** Prefer the site path so localhost can serve the same file Printful was given. */
export function printPreviewSrc(url) {
  if (!url) return ''
  try {
    const { pathname } = new URL(url, 'http://local')
    return pathname.startsWith('/print/') ? pathname : url
  } catch {
    return url
  }
}

export function formatPrintOrderDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-CA')
}

/** Which admin actions a stored status allows — table and detail share this. */
export function printOrderFlags({ status, paymentProvider } = {}) {
  return {
    canMarkPaid: status === 'awaiting_payment' && (paymentProvider || 'none') === 'none',
    canFulfill: status === 'paid' || status === 'submit_failed',
  }
}

/** Dashboard row: labels and urls only — the table must not know the catalog. */
export function presentPrintOrder(order) {
  const quantity = order.quantity || 1
  return {
    orderNumber: order.orderNumber,
    href: order.orderNumber ? `/dashboard/print-orders/${encodeURIComponent(order.orderNumber)}` : null,
    createdAt: order.createdAt ? new Date(order.createdAt).toISOString() : null,
    quoteSlug: order.quoteSlug,
    quoteHref: printQuoteHref(order.quoteSlug),
    customerName: order.customer?.name || '',
    customerEmail: order.customer?.email || '',
    locality: formatPrintLocality(order.customer),
    shipTo: formatPrintShipTo(order.customer),
    itemLabel: formatPrintOrderItem(order),
    artSrc: printPreviewSrc(order.printFileUrl),
    printFileUrl: order.printFileUrl,
    printfulOrderId: order.printfulOrderId || '',
    failureReason: order.failureReason || '',
    paymentProvider: order.paymentProvider || 'none',
    status: order.status,
    totalLabel: formatPrice(
      (order.retailPrice || 0) * quantity + (order.shippingPrice || 0) + (order.taxAmount || 0),
      order.currency
    ),
    ...printOrderFlags(order),
  }
}

/**
 * How artwork sits in fabric rather than on top of it: dark ink darkens a light
 * garment, light ink lightens a dark one, and either way the weave and folds
 * underneath still read through. Painting the design opaque is what makes a
 * preview look like a sticker.
 */
export function inkBlendMode(ink) {
  const hex = String(ink || '').replace('#', '')
  if (hex.length !== 6) return 'multiply'
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return (r * 299 + g * 587 + b * 114) / 1000 > 128 ? 'screen' : 'multiply'
}
