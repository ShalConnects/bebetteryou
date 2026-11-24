import { bookCover } from '@/config/books'
import { readBooks } from '@/libs/books-store'
import { logInfo } from '@/libs/logger'
import { getSiteUrl } from '@/libs/site-url'
import { readyNetworks } from '@/libs/social'
import { readPostsBySlugs, recordPost } from '@/libs/social/post-store'
import { postPinterest } from '@/libs/social/providers/pinterest'

/** Sunday (UTC) — no card posts that day. */
export const bookPinWeekday = 0
export const bookKey = (slug) => `book-${slug}`

/** Never-pinned books first (A–Z); once all are up, the one pinned longest ago. */
export function pickBookForPin(books, postsByKey = {}) {
  const pinnedAt = (b) => postsByKey[bookKey(b.slug)]?.pinterest
  const sorted = [...books].sort((a, b) => a.slug.localeCompare(b.slug))
  return (
    sorted.find((b) => !pinnedAt(b)?.ok) ||
    sorted.sort((a, b) => new Date(pinnedAt(a).at) - new Date(pinnedAt(b).at))[0] ||
    null
  )
}

/** Cron: one "book of the week" pin on Sundays, linking to that book on /books. */
export async function runBookPin({ now = new Date() } = {}) {
  if (now.getUTCDay() !== bookPinWeekday) return { skipped: true, reason: 'not_sunday' }
  if (!(await readyNetworks()).some((n) => n.id === 'pinterest' && n.ready)) return { skipped: true, reason: 'pinterest_not_ready' }

  const books = readBooks()
  const posts = await readPostsBySlugs(books.map((b) => bookKey(b.slug)))
  const today = now.toISOString().slice(0, 10)
  if (Object.values(posts).some((p) => p.pinterest?.ok && p.pinterest.at?.startsWith(today))) {
    return { skipped: true, reason: 'already_pinned_today' }
  }
  const book = pickBookForPin(books, posts)
  if (!book) return { skipped: true, reason: 'no_books' }

  const { renderBookPin } = await import('@/libs/book-pin.mjs')
  const site = getSiteUrl()
  const cover = Buffer.from(await (await fetch(`${site}${bookCover(book)}`)).arrayBuffer())
  const result = { id: 'pinterest', ok: false }
  try {
    const posted = await postPinterest({
      imageBuffer: await renderBookPin(cover, book),
      title: `${book.title} — ${book.blurb || book.author}`,
      caption: `${book.title} by ${book.author}. ${book.blurb || ''}\n\n${book.description || ''}`,
      altText: `${book.title} by ${book.author} — book cover`,
      link: `${site}/books?utm_source=pinterest&utm_medium=social&utm_campaign=book-pin#${book.slug}`,
    })
    Object.assign(result, { ok: true, url: posted.url })
  } catch (err) {
    result.error = err.message || 'Failed'
  }
  await recordPost(bookKey(book.slug), result)
  logInfo('Book pin', { slug: book.slug, ...result })
  return { slug: book.slug, ...result }
}
