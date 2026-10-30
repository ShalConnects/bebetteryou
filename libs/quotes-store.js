import fs from 'fs'
import path from 'path'
import { cardRevision } from '@/config/quote-card'
import { isQuotePublic, withVisibility } from './quote-visibility'
import { mongoUri } from './mongo-uri'
import { logError } from './logger'

export { isQuotePublic }

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

/** Mongo wins by slug, but keep a local `rev` when Atlas never stored one.
 *  Mongo-only cards (created on Vercel) default to the current card revision.
 *  Keep `createdAt` as ISO for week-in-review; drop other Mongo doc fields. */
export function overlayQuote(local, remote) {
  if (!remote) return local
  const next = { ...local, ...remote }
  next.rev = remote.rev ?? local?.rev
  if (next.rev == null && !local) next.rev = cardRevision
  delete next._id
  delete next.__v
  delete next.updatedAt
  delete next.deleted
  if (next.createdAt) next.createdAt = new Date(next.createdAt).toISOString()
  else delete next.createdAt
  if (next.publishAt) next.publishAt = new Date(next.publishAt).toISOString()
  else delete next.publishAt
  return next
}

/** Local JSON + optional Mongo overlays (remote wins by slug). */
export async function readQuotes() {
  const local = readLocal()
  if (!mongoUri()) return sortByN(local)

  try {
    const { connectDB } = await import('./mongo')
    const Quote = (await import('@/models/Quote')).default
    await connectDB()
    const remote = asList(
      await Quote.find()
        .select('slug n src text author tags theme related rev status publishAt createdAt deleted')
        .lean()
    )
    const map = new Map(local.map((q) => [q.slug, q]))
    for (const q of remote) {
      if (q?.deleted) map.delete(q.slug)
      else if (q?.slug) map.set(q.slug, overlayQuote(map.get(q.slug), q))
    }
    return sortByN([...map.values()])
  } catch (error) {
    logError('Quotes Mongo overlay failed; using data/quotes.json', error)
    return sortByN(local)
  }
}

/** Persist catalog entry: Mongo when configured; local JSON when not on Vercel. */
export async function appendQuote(quote) {
  if (mongoUri()) {
    const { connectDB } = await import('./mongo')
    const Quote = (await import('@/models/Quote')).default
    await connectDB()
    await Quote.findOneAndUpdate({ slug: quote.slug }, { ...quote, deleted: false }, {
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
    // A card bundled in data/quotes.json would come back from the file, so leave a tombstone.
    if (readLocal().some((q) => q.slug === slug)) {
      await Quote.updateOne({ slug }, { $set: { deleted: true } }, { upsert: true })
    } else await Quote.deleteOne({ slug })
  }

  if (!process.env.VERCEL) {
    writeLocal(readLocal().filter((q) => q.slug !== slug))
  } else if (!mongoUri()) {
    throw new Error('MONGODB_URI required to delete quotes on Vercel')
  }
}

async function findQuote(slug) {
  const key = String(slug || '').trim()
  if (!key) return null
  return (await readQuotes()).find((q) => q.slug === key) || null
}

/** Hold a not-yet-public quote until social/site go-live. No-op if already public. */
export async function scheduleQuoteVisibility(slug, runAt) {
  const existing = await findQuote(slug)
  if (!existing) throw new Error('Quote not found')
  if (isQuotePublic(existing)) return existing
  const next = withVisibility(existing, { status: 'scheduled', publishAt: runAt })
  await appendQuote(next)
  return next
}

/** Put the quote on the public site. No-op if already public. */
export async function publishQuote(slug) {
  const existing = await findQuote(slug)
  if (!existing) throw new Error('Quote not found')
  if (isQuotePublic(existing)) return existing
  const next = withVisibility(existing, {
    status: 'published',
    publishAt: existing.publishAt || new Date(),
  })
  await appendQuote(next)
  return next
}

/** After canceling a schedule, keep unpublished quotes off the site. */
export async function unscheduleQuoteVisibility(slug) {
  const existing = await findQuote(slug)
  if (!existing) throw new Error('Quote not found')
  if (existing.status !== 'scheduled') return existing
  const next = withVisibility(existing, { status: 'draft' })
  await appendQuote(next)
  return next
}
