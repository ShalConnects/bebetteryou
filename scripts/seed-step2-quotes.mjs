/**
 * Create the step-2 buffer quotes without email fan-out.
 *   node --env-file=.env.local scripts/seed-step2-quotes.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'
import { cardRevision, renderQuoteCard } from '../libs/quote-card.mjs'
import { mongoUri } from '../libs/mongo-uri.js'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const dataFile = path.join(root, 'data/quotes.json')
const quotesDir = path.join(root, 'public/quotes')

const QuoteSchema = new mongoose.Schema(
  {
    slug: String,
    n: Number,
    src: String,
    text: String,
    author: String,
    tags: [String],
    theme: String,
    rev: Number,
    related: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
)

const rows = [
  { text: 'You attract what you are ready for!', tags: ['Growth', 'Mindset'] },
  {
    text: "I've seen maturity evolve more through experience than age.",
    tags: ['Growth'],
  },
  {
    text: "Pay attention to how people act when you're not on good terms.",
    tags: ['Yourself', 'Love'],
  },
  {
    text: "If what you're doing over and over is getting you nowhere, maybe it's time to try something different.",
    tags: ['Motivation', 'Growth'],
  },
  {
    text: "I like people who don't need everyone to like them.",
    tags: ['Yourself'],
  },
  {
    text: "We don't always choose what happens to us, but we can choose to see it as positive, to believe it is for the best, and to use it to grow.",
    tags: ['Mindset', 'Growth'],
  },
  {
    text: 'Value the people who love, respect and trust you the most, and forget about the negative and toxic people who don’t deserve you.',
    tags: ['Love', 'Yourself'],
  },
  {
    text: 'Nowadays people know the price of everything and the value of nothing.',
    author: 'Oscar Wilde',
    tags: ['Mindset'],
  },
  {
    text: "There's no reason to look back when you have so much to look forward to.",
    tags: ['Motivation', 'Growth'],
  },
  {
    text: "Stop hating yourself for everything you aren't, and start loving yourself for everything you are.",
    tags: ['Yourself', 'Love'],
  },
  {
    text: 'Sometimes you need to be alone. Not to be lonely, but to enjoy your free time being yourself.',
    tags: ['Yourself'],
  },
  {
    text: 'The pain of holding on is always greater than the pain of letting go.',
    tags: ['Yourself', 'Love'],
  },
  {
    text: "Sometimes you need to be yourself so that you'll know who's going to leave and who will stay.",
    tags: ['Yourself', 'Growth'],
  },
]

async function main() {
  const catalog = JSON.parse(fs.readFileSync(dataFile, 'utf8'))
  let n = catalog.reduce((max, q) => Math.max(max, q.n), 0)
  const created = []
  const uri = mongoUri()
  let Quote = null
  if (uri) {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 })
    Quote = mongoose.models.Quote || mongoose.model('Quote', QuoteSchema)
  }

  fs.mkdirSync(quotesDir, { recursive: true })

  for (const row of rows) {
    n += 1
    const author = String(row.author || '').trim()
    const buffer = await renderQuoteCard({ n, text: row.text, author })
    const file = `bby${n}.jpg`
    fs.writeFileSync(path.join(quotesDir, file), buffer)
    const quote = {
      slug: `bby-${n}`,
      n,
      src: `/quotes/${file}`,
      text: row.text,
      author,
      tags: row.tags,
      rev: cardRevision,
    }
    catalog.unshift(quote)
    if (Quote) {
      await Quote.findOneAndUpdate({ slug: quote.slug }, quote, {
        upsert: true,
        setDefaultsOnInsert: true,
      })
    }
    created.push({ n: quote.n, slug: quote.slug, tags: quote.tags })
    console.log(`#${quote.n} ${quote.slug}`)
  }

  fs.writeFileSync(dataFile, JSON.stringify(catalog, null, 2) + '\n')
  if (uri) await mongoose.disconnect()
  console.log(
    JSON.stringify(
      { created: created.length, total: catalog.length, next: n + 1 },
      null,
      2
    )
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
