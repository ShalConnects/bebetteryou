/**
 * Create #31–#38 and schedule Sat/Mon/Wed/Thu at 14:00 UTC.
 *   node --env-file=.env.local scripts/schedule-batch-31-38.mjs
 *   BLOB_READ_WRITE_TOKEN=… node --env-file=.env.local scripts/schedule-batch-31-38.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'
import { cardRevision, renderQuoteCard, assertQuoteFits } from '../libs/quote-card.mjs'
import { saveAsset } from '../libs/asset-store.js'
import { mongoUri } from '../libs/mongo-uri.js'
import { slotOnDate } from '../libs/social/post-slot.js'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const NETWORKS = ['instagram', 'threads', 'facebook', 'youtube', 'pinterest', 'bluesky', 'telegram']

const plan = [
  { n: 31, date: '2026-11-07', text: "A relationship without trust is like a car without gas; you can stay in it as long as you want, but it won't go anywhere." },
  { n: 32, date: '2026-11-09', text: "Smile; it's the best thing you can do to irritate those who wish to destroy you." },
  { n: 33, date: '2026-11-11', text: "Your emotions mean you're moving into something greater." },
  { n: 34, date: '2026-11-12', text: 'In a growth mindset, your flaws are just a to-do list of things to improve.' },
  { n: 35, date: '2026-11-14', text: 'You can never rise higher than your expectations of yourself. Expect the best!', author: 'Brian Tracy' },
  { n: 36, date: '2026-11-16', text: 'Whatever you overcome will only make you stronger.' },
  { n: 37, date: '2026-11-18', text: "When it's time to let go, don't doubt or hesitate. Goodbye to good is hello to great!" },
  { n: 38, date: '2026-11-19', text: 'There are two ways of being rich. One is to have all you want; the other is to be satisfied with what you have.' },
]

async function main() {
  const uri = mongoUri()
  if (!uri) throw new Error('MONGODB_URI required')
  if (!process.env.SITE_URL) throw new Error('SITE_URL required for card footer')

  for (const row of plan) assertQuoteFits(row.text)

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 })
  const db = mongoose.connection.db
  const quotes = db.collection('quotes')
  const schedules = db.collection('socialschedules')

  const existing = await quotes.find({ n: { $in: plan.map((p) => p.n) } }).project({ n: 1, slug: 1 }).toArray()
  if (existing.length) {
    throw new Error(`Quotes already exist: ${existing.map((q) => `#${q.n}`).join(', ')}`)
  }

  const created = []
  for (const row of plan) {
    const author = String(row.author || '').trim()
    const runAt = slotOnDate(row.date)
    const buffer = await renderQuoteCard({ n: row.n, text: row.text, author, tags: [] })
    const filename = `bby${row.n}.jpg`
    const src = await saveAsset({
      dir: 'quotes',
      filename,
      buffer,
      contentType: 'image/jpeg',
    })
    // Keep a local copy for preview even when Blob is used.
    fs.mkdirSync(path.join(root, 'public/quotes'), { recursive: true })
    fs.writeFileSync(path.join(root, 'public/quotes', filename), buffer)

    const quote = {
      slug: `bby-${row.n}`,
      n: row.n,
      src,
      text: row.text,
      author,
      tags: [],
      rev: cardRevision,
      status: 'scheduled',
      publishAt: runAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    await quotes.insertOne(quote)

    const pending = await schedules.findOne({ slug: quote.slug, status: 'pending' })
    if (pending) throw new Error(`Pending schedule already exists for ${quote.slug}`)

    const schedule = await schedules.insertOne({
      slug: quote.slug,
      networks: NETWORKS,
      runAt,
      status: 'pending',
      error: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    created.push({
      n: row.n,
      slug: quote.slug,
      runAt: runAt.toISOString(),
      src,
      scheduleId: String(schedule.insertedId),
      author: author || null,
    })
    console.log(`#${row.n} ${quote.slug} → ${runAt.toISOString()} (${src.startsWith('http') ? 'blob' : 'local'})`)
  }

  await mongoose.disconnect()
  console.log(JSON.stringify({ created: created.length, rows: created }, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
