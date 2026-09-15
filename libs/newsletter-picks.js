import { listPosts } from '@/libs/blog'
import { readBooks } from '@/libs/books-store'
import { readQuotes } from '@/libs/quotes-store'

function shuffle(list) {
  const rows = [...list]
  for (let i = rows.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[rows[i], rows[j]] = [rows[j], rows[i]]
  }
  return rows
}

/**
 * Random catalog picks for newsletter discovery blocks.
 * Omits empty slots — callers should not render placeholders.
 */
export async function pickNewsletterExtras({
  excludeQuoteSlug,
  excludePostSlug,
  excludeBookSlug,
  quoteCount = 4,
  postCount = 2,
  bookCount = 1,
} = {}) {
  const [allQuotes, allPosts, allBooks] = await Promise.all([
    readQuotes(),
    Promise.resolve(listPosts()),
    Promise.resolve(readBooks()),
  ])

  const quotes = shuffle(
    allQuotes.filter((q) => q?.slug && q?.src && q.slug !== excludeQuoteSlug)
  ).slice(0, quoteCount)

  const posts = shuffle(
    allPosts.filter((p) => p?.slug && p?.title && p.slug !== excludePostSlug)
  ).slice(0, postCount)

  const books = shuffle(
    allBooks.filter((b) => b?.slug && b?.title && b.slug !== excludeBookSlug)
  ).slice(0, bookCount)

  return {
    quotes,
    posts,
    book: books[0] || null,
  }
}
