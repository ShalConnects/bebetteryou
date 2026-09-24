import { appConfig } from '@/config/app'
import { bookRel, bookUrl } from '@/config/books'
import { listPosts } from '@/libs/blog'
import { postHref } from '@/libs/blog-url'
import { listBooks } from '@/libs/books'
import { listQuotes } from '@/libs/content'
import { formatTag } from '@/libs/quotes-url'
import { SEARCH_MAX_Q, SEARCH_MIN_LEN, SEARCH_PREVIEW_LIMIT } from '@/libs/search-url'

export { SEARCH_MAX_Q, SEARCH_MIN_LEN, SEARCH_PREVIEW_LIMIT } from '@/libs/search-url'

/** Trim + hard cap so URLs and API stay bounded. */
export function normalizeQuery(q) {
  return String(q ?? '')
    .trim()
    .slice(0, SEARCH_MAX_Q)
}

export function tokenize(q) {
  return normalizeQuery(q)
    .toLowerCase()
    .split(/[^a-z0-9#]+/i)
    .map((t) => t.replace(/^#+/, ''))
    .filter((t) => t.length > 0)
}

/**
 * Score weighted fields against AND-tokens.
 * Higher weight + earlier match wins. Returns 0 when any token is missing.
 */
export function scoreFields(fields, tokens) {
  if (!tokens.length) return 0
  let total = 0
  for (const token of tokens) {
    let best = 0
    for (const { text, weight = 1 } of fields) {
      if (!text) continue
      const hay = String(text).toLowerCase()
      const at = hay.indexOf(token)
      if (at < 0) continue
      const early = at === 0 || (at > 0 && /\s/.test(hay[at - 1])) ? 2 : 1
      best = Math.max(best, weight * early)
    }
    if (!best) return 0
    total += best
  }
  return total
}

function quoteHit(q, tokens) {
  const score = scoreFields(
    [
      { text: q.text, weight: 5 },
      { text: q.author, weight: 4 },
      { text: (q.tags || []).join(' '), weight: 3 },
      { text: q.slug, weight: 1 },
      { text: q.n != null ? String(q.n) : '', weight: 1 },
    ],
    tokens
  )
  if (!score) return null
  const title = String(q.text || '').trim()
  return {
    type: 'quote',
    href: `/quotes/${q.slug}`,
    title: title.length > 120 ? `${title.slice(0, 117)}…` : title,
    subtitle: q.author?.trim() || (q.tags?.[0] ? formatTag(q.tags[0]) : `#${q.n}`),
    score,
  }
}

function postHit(p, tokens) {
  const score = scoreFields(
    [
      { text: p.title, weight: 5 },
      { text: p.excerpt, weight: 3 },
      { text: p.description, weight: 2 },
      { text: p.tag, weight: 2 },
      { text: p.topic, weight: 2 },
      { text: p.slug, weight: 1 },
    ],
    tokens
  )
  if (!score) return null
  return {
    type: 'post',
    href: postHref(p.slug),
    title: p.title,
    subtitle: p.excerpt || p.description || '',
    score,
  }
}

function bookHit(b, tokens) {
  const href = bookUrl(b)
  if (!href) return null
  const score = scoreFields(
    [
      { text: b.title, weight: 5 },
      { text: b.author, weight: 4 },
      { text: b.blurb, weight: 3 },
      { text: b.description, weight: 2 },
      { text: (b.tags || []).join(' '), weight: 2 },
      { text: b.slug, weight: 1 },
    ],
    tokens
  )
  if (!score) return null
  return {
    type: 'book',
    href,
    external: true,
    rel: bookRel,
    title: b.title,
    subtitle: b.author || b.blurb || '',
    score,
  }
}

function rank(items, limit) {
  const sorted = [...items].sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
  return limit > 0 ? sorted.slice(0, limit) : sorted
}

/**
 * Cross-catalog search. Empty / short queries return empty groups (no dump of everything).
 * @param {string} q
 * @param {{ limit?: number }} [opts] — per-group cap; omit or 0 for all matches
 */
export async function searchSite(q, { limit = 0 } = {}) {
  const query = normalizeQuery(q)
  const tokens = tokenize(query)
  const empty = { q: query, groups: [], total: 0 }

  if (query.length < SEARCH_MIN_LEN || !tokens.length) return empty

  const blog = appConfig.features.enableBlog
  const books = appConfig.features.enableBooks

  const [quotes, posts, bookRows] = await Promise.all([
    listQuotes(),
    Promise.resolve(blog ? listPosts() : []),
    Promise.resolve(books ? listBooks() : []),
  ])

  const quoteAll = quotes.map((row) => quoteHit(row, tokens)).filter(Boolean)
  const postAll = posts.map((row) => postHit(row, tokens)).filter(Boolean)
  const bookAll = bookRows.map((row) => bookHit(row, tokens)).filter(Boolean)

  const quoteItems = rank(quoteAll, limit)
  const postItems = rank(postAll, limit)
  const bookItems = rank(bookAll, limit)

  const groups = [
    quoteItems.length ? { type: 'quotes', label: 'Quotes', items: quoteItems } : null,
    postItems.length ? { type: 'posts', label: 'Notes', items: postItems } : null,
    bookItems.length ? { type: 'books', label: 'Books', items: bookItems } : null,
  ].filter(Boolean)

  return {
    q: query,
    groups,
    // Uncapped — preview `groups` may be sliced, but callers need the real total.
    total: quoteAll.length + postAll.length + bookAll.length,
  }
}
