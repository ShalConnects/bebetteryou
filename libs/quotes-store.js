import fs from 'fs'
import path from 'path'
import { mongoUri } from './mongo'

const dataFile = path.join(process.cwd(), 'data/quotes.json')

function readLocal() {
  return asList(JSON.parse(fs.readFileSync(dataFile, 'utf8')))
}

function writeLocal(quotes) {
  fs.writeFileSync(dataFile, JSON.stringify(quotes, null, 2))
}

/** Guarantee an array catalog (guards corrupt JSON / bad remote payloads). */
export function asList(data) {
  return Array.isArray(data) ? data : []
}

export function nextQuoteN(quotes) {
  return asList(quotes).reduce((max, q) => Math.max(max, q.n), 0) + 1
}

function sortByN(quotes) {
  return [...asList(quotes)].sort((a, b) => b.n - a.n)
}

/** Local JSON + optional Mongo overlays (remote wins by slug). */
export async function readQuotes() {
  const local = readLocal()
  if (!mongoUri()) return sortByN(local)

  try {
    const { connectDB } = await import('./mongo')
    const Quote = (await import('@/models/Quote')).default
    await connectDB()
    const remote = asList(await Quote.find().select('slug n src text author tags theme related').lean())
    if (!remote.length) return local

    const map = new Map(local.map((q) => [q.slug, q]))
    for (const q of remote) {
      if (q?.slug) map.set(q.slug, q)
    }
    return sortByN([...map.values()])
  } catch {
    return sortByN(local)
  }
}

/** Persist catalog entry: Mongo when configured; local JSON when not on Vercel. */
export async function appendQuote(quote) {
  if (mongoUri()) {
    const { connectDB } = await import('./mongo')
    const Quote = (await import('@/models/Quote')).default
    await connectDB()
    await Quote.findOneAndUpdate({ slug: quote.slug }, quote, {
      upsert: true,
      setDefaultsOnInsert: true,
    })
  }

  if (!process.env.VERCEL) {
    const quotes = readLocal()
    const i = quotes.findIndex((q) => q.slug === quote.slug)
    if (i >= 0) quotes[i] = quote
    else quotes.unshift(quote)
    writeLocal(quotes)
  } else if (!mongoUri()) {
    throw new Error('MONGODB_URI required to save quotes on Vercel')
  }
}

export async function removeQuote(slug) {
  if (mongoUri()) {
    const { connectDB } = await import('./mongo')
    const Quote = (await import('@/models/Quote')).default
    await connectDB()
    await Quote.deleteOne({ slug })
  }

  if (!process.env.VERCEL) {
    writeLocal(readLocal().filter((q) => q.slug !== slug))
  } else if (!mongoUri()) {
    throw new Error('MONGODB_URI required to delete quotes on Vercel')
  }
}
