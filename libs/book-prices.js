import fs from 'fs'
import path from 'path'
import { fetchAmazonPrices, paapiReady } from '@/libs/amazon-paapi'
import { logError } from '@/libs/logger'

const TTL_MS = 24 * 60 * 60 * 1000
const cacheFile = path.join(process.cwd(), 'data/book-prices.json')

/** Merge a fresh PA-API price onto a cached row; keeps prior display when amount changes. */
export function mergePriceEntry(prev, next, at = Date.now()) {
  if (!next?.display) return prev || null
  const changed = prev?.amount != null && next.amount != null && prev.amount !== next.amount
  return {
    amount: next.amount,
    currency: next.currency || 'USD',
    display: next.display,
    at,
    prevDisplay: changed ? prev.display : prev?.prevDisplay || '',
    changed: Boolean(changed),
  }
}

function readCache() {
  try {
    return JSON.parse(fs.readFileSync(cacheFile, 'utf8'))
  } catch {
    return {}
  }
}

function writeCache(map) {
  try {
    fs.writeFileSync(cacheFile, JSON.stringify(map, null, 2))
  } catch {
    /* read-only FS (e.g. some serverless) — memory still works for the request */
  }
}

function stale(entry, now = Date.now()) {
  return !entry?.at || now - entry.at > TTL_MS
}

/** Attach `price` / `priceWas` from PA-API (cached 24h). No-op without credentials. */
export async function withBookPrices(books = []) {
  const list = Array.isArray(books) ? books : []
  if (!paapiReady() || !list.length) return list.map((b) => ({ ...b, price: '', priceWas: '' }))

  const cache = readCache()
  const now = Date.now()
  const need = [
    ...new Set(list.map((b) => b.asin).filter((asin) => asin && stale(cache[asin], now))),
  ]

  if (need.length) {
    try {
      const fresh = await fetchAmazonPrices(need)
      for (const asin of need) {
        const merged = mergePriceEntry(cache[asin], fresh[asin], now)
        if (merged) cache[asin] = merged
      }
      writeCache(cache)
    } catch (error) {
      logError('Amazon PA-API price refresh failed', error)
    }
  }

  return list.map((b) => {
    const row = b.asin ? cache[b.asin] : null
    return {
      ...b,
      price: row?.display || '',
      priceWas: row?.changed ? row.prevDisplay || '' : '',
    }
  })
}
