/** Public site: missing status = legacy published. */
export function isQuotePublic(quote) {
  if (!quote) return false
  const status = quote.status
  return status == null || status === 'published'
}

export function withVisibility(quote, { status, publishAt } = {}) {
  const next = { ...quote, status }
  if (status === 'scheduled' && publishAt != null) {
    next.publishAt = new Date(publishAt).toISOString()
  } else if (status === 'draft') {
    delete next.publishAt
  } else if (status === 'published' && publishAt != null) {
    next.publishAt = new Date(publishAt).toISOString()
  }
  return next
}
