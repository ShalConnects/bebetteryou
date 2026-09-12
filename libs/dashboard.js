import { readyNetworks } from '@/libs/social'
import { nextQuoteN } from './quotes-store'
import { readTags, tagNames } from './tags-store'

export async function quoteStats(quotes) {
  const total = quotes.length
  const latest = quotes.reduce((max, q) => Math.max(max, q.n), 0)
  const catalog = tagNames(await readTags())
  const tagCounts = Object.fromEntries(
    catalog.map((tag) => [tag, quotes.filter((q) => q.tags?.includes(tag)).length])
  )
  return { total, latest, next: nextQuoteN(quotes), tagCounts }
}

export async function adminOverview(quotes) {
  return { stats: await quoteStats(quotes), social: await readyNetworks() }
}
