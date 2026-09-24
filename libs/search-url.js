/** Pure URL + shared constants for /search (safe for client; no fs). */

export const SEARCH_MIN_LEN = 2
export const SEARCH_MAX_Q = 100
/** Preview cap per group in the overlay / API. */
export const SEARCH_PREVIEW_LIMIT = 5

export function searchHref({ q, page } = {}) {
  const params = new URLSearchParams()
  const query = String(q || '').trim()
  if (query) params.set('q', query)
  if (page && Number(page) > 1) params.set('page', String(page))
  const s = params.toString()
  return s ? `/search?${s}` : '/search'
}
