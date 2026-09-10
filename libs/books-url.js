/** Catalog href with optional tag + page. */
export function booksHref({ tag, page } = {}) {
  const q = new URLSearchParams()
  if (tag) q.set('tag', tag)
  if (page && Number(page) > 1) q.set('page', String(page))
  const s = q.toString()
  return s ? `/books?${s}` : '/books'
}
