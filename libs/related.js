import { relatedCounts } from '@/config/related'
import { listPosts, postTag } from '@/libs/blog'
import { listBooks } from '@/libs/books'
import { hybridPick } from '@/libs/hybrid-pick'
import { seedFromKey } from '@/libs/scripture-core'

/** Blog topic → quote-tag bridge (and optional post.tag override). */
export function tagsForPost(post) {
  const tag = postTag(post)
  return tag ? [tag] : []
}

function slugs(list) {
  if (!Array.isArray(list)) return undefined
  const out = [...new Set(list.map((s) => String(s).trim()).filter(Boolean))]
  return out.length ? out : undefined
}

/** Optional hard pins for books/posts; empty clears. */
export function normalizeRelated(input) {
  if (input == null || typeof input !== 'object') return null
  const out = {}
  const books = slugs(input.books)
  const posts = slugs(input.posts)
  if (books) out.books = books
  if (posts) out.posts = posts
  return Object.keys(out).length ? out : null
}

export function relatedBooksFor(tags, pins, seed, exclude) {
  return hybridPick({
    pool: listBooks(),
    pins,
    tags,
    exclude,
    count: relatedCounts.books,
    seed,
  })
}

export function relatedPostsFor(tags, pins, seed, exclude) {
  return hybridPick({
    pool: listPosts(),
    pins,
    tags,
    exclude,
    count: relatedCounts.posts,
    seed,
    tagsOf: tagsForPost,
  })
}

/** Quote page: pinned + soft books/posts. Scripture stays in TraditionPassage. */
export function relatedForQuote(quote) {
  const pins = quote?.related || {}
  const tags = quote?.tags || []
  const seed = seedFromKey(quote?.slug)
  return {
    books: relatedBooksFor(tags, pins.books, seed),
    posts: relatedPostsFor(tags, pins.posts, seed + 1),
  }
}

/** Blog post: pinned + soft books (quotes via postQuotes). */
export function relatedForPost(post) {
  const pins = post?.related || {}
  return {
    books: relatedBooksFor(tagsForPost(post), pins.books, seedFromKey(post?.slug)),
  }
}

export { hybridPick }
