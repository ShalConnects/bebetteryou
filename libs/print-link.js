/**
 * The design step hands its selection to the shipping step through the url, so
 * that step is refresh-safe, linkable and back-button friendly instead of
 * depending on state that only exists in one tab.
 *
 * Builder and parser live together on purpose: they are the same contract, and
 * splitting them is how the two sides quietly stop agreeing on a param name.
 */
export const PRINT_QTY_MAX = 10
export const printQuantities = Array.from({ length: PRINT_QTY_MAX }, (_, i) => i + 1)

/** Not a catalog slug — copy travels in the query, never as a stored quote. */
export const customPrintSlug = 'own'

export function clampPrintQty(value) {
  const qty = Number.parseInt(value, 10)
  return Math.min(Math.max(Number.isFinite(qty) ? qty : 1, 1), PRINT_QTY_MAX)
}

function withOwnCopy(params, slug, { text, author } = {}) {
  if (slug !== customPrintSlug) return params
  if (text) params.set('text', text)
  if (author) params.set('author', author)
  return params
}

export function printHref(slug, { productId, text, author } = {}) {
  const params = withOwnCopy(new URLSearchParams(), slug, { text, author })
  if (productId) params.set('product', productId)
  const query = params.toString()
  return query ? `/print/${slug}?${query}` : `/print/${slug}`
}

export function printShipHref(slug, { productId, color, size, placement, style, leading, scale, credit, quantity, text, author }) {
  const params = withOwnCopy(
    new URLSearchParams({
      product: productId,
      color,
      size,
      placement,
      style,
      leading,
      scale,
      credit,
      qty: String(quantity),
    }),
    slug,
    { text, author }
  )
  return `/print/${slug}/ship?${params}`
}

/** Shape only — the catalog still decides whether the selection is real. */
export function parsePrintParams(params = {}) {
  const chosen = {
    productId: params.product,
    color: params.color,
    size: params.size,
    placement: params.placement,
    style: params.style,
    leading: params.leading,
    scale: params.scale,
    credit: params.credit,
    quantity: clampPrintQty(params.qty),
  }
  if (params.text) chosen.text = params.text
  if (params.author) chosen.author = params.author
  return chosen
}

/** Catalog quotes have a public page; `own` never does. */
export function printQuoteHref(slug) {
  return slug && slug !== customPrintSlug ? `/quotes/${slug}` : null
}
