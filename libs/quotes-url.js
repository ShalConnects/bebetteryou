/** Pure URL + paging helpers for /quotes (safe for UI; no fs). */
import { shuffle } from '@/libs/sample'

export const quoteSorts = [
  { id: 'newest', label: 'Newest' },
  { id: 'oldest', label: 'Oldest' },
  { id: 'random', label: 'Random' },
]

/** Display label: Mindset → #mindset */
export function formatTag(tag) {
  return tag ? `#${String(tag).replace(/^#/, '').toLowerCase()}` : ''
}

export function quotesListTitle({ tag, page, sort }) {
  const parts = [tag ? `${formatTag(tag)} quotes` : 'Quotes']
  if (sort && sort !== 'newest') parts.push(quoteSorts.find((s) => s.id === sort)?.label || sort)
  if (page > 1) parts.push(`Page ${page}`)
  return parts.join(' — ')
}

export function catalogHref(path, { tag, page, sort, seed } = {}) {
  const q = new URLSearchParams()
  if (tag) q.set('tag', tag)
  if (sort && sort !== 'newest') q.set('sort', sort)
  if (sort === 'random' && seed != null) q.set('seed', String(seed))
  if (page > 1) q.set('page', String(page))
  const s = q.toString()
  return s ? `${path}?${s}` : path
}

export function quotesHref(opts) {
  return catalogHref('/quotes', opts)
}

export function shopHref(opts) {
  return catalogHref('/shop', opts)
}

export function sortQuotes(quotes, sort = 'newest', seed) {
  if (sort === 'oldest') return quotes.slice().sort((a, b) => a.n - b.n)
  if (sort === 'random') return shuffle(quotes, seed ?? (Math.random() * 1e9) | 0)
  return quotes
}
