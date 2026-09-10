import { cache } from 'react'
import { asList, readQuotes } from '@/libs/quotes-store'
import { cardRevision } from '@/config/quote-card'
import { heroQuoteCount, homeQuoteCount, quotesPageSize } from '@/config/quotes'
import { moodIntents, readTags, tagNames } from '@/libs/tags-store'
import { sortQuotes } from '@/libs/quotes-url'
import { paginate } from '@/libs/paging'
import { isPrintableQuote } from '@/libs/quote-text'

export { heroQuoteCount, homeQuoteCount }
export { quotesHref } from '@/libs/quotes-url'

/** First string from searchParams value (`string | string[] | undefined`). */
export function param(v) {
  return Array.isArray(v) ? v[0] : v
}

export function resolveSort(v) {
  const s = param(v)
  return s === 'oldest' || s === 'random' ? s : 'newest'
}

export function resolveSeed(sort, v) {
  if (sort !== 'random') return undefined
  const n = Number(param(v))
  return Number.isFinite(n) && n > 0 ? n : (Math.random() * 1e9) | 0
}

/** Cards on the current design revision. Older ones stay in the store for the
    dashboard to manage, but stay off the public site until re-rendered. */
const publicQuotes = cache(async function publicQuotes() {
  return asList(await readQuotes()).filter((q) => q.rev === cardRevision)
})

export async function listQuotes(tag) {
  const quotes = await publicQuotes()
  const t = param(tag)
  return t ? quotes.filter((q) => q.tags?.includes(t)) : quotes
}

/** Shop catalog: only quotes the printer can typeset. */
export async function listPrintableQuotes(tag) {
  return (await listQuotes(tag)).filter(isPrintableQuote)
}

export async function pagePrintableQuotes(tag, page, sort = 'newest', seed) {
  return paginate(sortQuotes(await listPrintableQuotes(tag), sort, seed), page, quotesPageSize)
}

/** Filter, sort, then page. */
export async function pageQuotes(tag, page, sort = 'newest', seed) {
  return paginate(sortQuotes(await listQuotes(tag), sort, seed), page, quotesPageSize)
}

export async function getQuote(slug) {
  return (await publicQuotes()).find((q) => q.slug === slug)
}

async function tagsUsedBy(quotes) {
  const used = new Set(quotes.flatMap((q) => q.tags || []))
  return tagNames(await readTags()).filter((t) => used.has(t))
}

/** Catalog tags in use (stable catalog order). */
export async function quoteTags() {
  return tagsUsedBy(await publicQuotes())
}

export async function printableQuoteTags() {
  return tagsUsedBy(await listPrintableQuotes())
}

export async function listMoodIntents() {
  return moodIntents(await readTags())
}

export async function neighbors(slug) {
  const quotes = [...(await publicQuotes())].sort((a, b) => a.n - b.n)
  const i = quotes.findIndex((q) => q.slug === slug)
  return {
    prev: i > 0 ? quotes[i - 1] : null,
    next: i >= 0 && i < quotes.length - 1 ? quotes[i + 1] : null,
  }
}
