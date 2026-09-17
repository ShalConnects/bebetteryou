/**
 * One-shot catalog reset: salvage new-design quotes, wipe old rows/files,
 * recreate from #1. Dry-run unless --apply.
 *
 *   node --env-file=.env.local scripts/reset-quote-catalog.mjs
 *   node --env-file=.env.local scripts/reset-quote-catalog.mjs --apply
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'
import { cardRevision, renderQuoteCard } from '../libs/quote-card.mjs'
import { mongoUri } from '../libs/mongo-uri.js'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const quotesDir = path.join(root, 'public/quotes')
const dataFile = path.join(root, 'data/quotes.json')
const apply = process.argv.includes('--apply')

const TAG_FOR_THEME = {
  perseverance: 'Motivation',
  clarity: 'Mindset',
  growth: 'Growth',
  love: 'Love',
  'self-worth': 'Yourself',
}
const CATALOG = new Set(Object.values(TAG_FOR_THEME))

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

const SocialPostSchema = new mongoose.Schema({
  slug: String,
  network: String,
})

const PrintOrderSchema = new mongoose.Schema({
  quoteSlug: String,
  status: String,
})

function cleanAuthor(raw) {
  const author = String(raw || '').trim()
  if (!author || /^unknown$/i.test(author)) return ''
  return author
}

function fingerprint(text) {
  return String(text || '')
    .replace(/\n/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\s+/g, ' ')
}

function keeperTags(row) {
  const tags = (row.tags || []).filter((t) => CATALOG.has(t))
  if (tags.length) return tags
  const fromTheme = TAG_FOR_THEME[row.theme]
  return fromTheme ? [fromTheme] : []
}

function asKeeper(row) {
  const text = String(row.text || '').trim()
  if (!text) return null
  if (row.rev != null && row.rev !== cardRevision) return null
  return {
    text,
    author: cleanAuthor(row.author),
    tags: keeperTags(row),
    theme: TAG_FOR_THEME[row.theme] ? row.theme : undefined,
    fromN: row.n,
    fromSlug: row.slug,
  }
}

async function main() {
  const uri = mongoUri()
  const local = JSON.parse(fs.readFileSync(dataFile, 'utf8'))
  let remote = []
  let printOrders = 0

  if (uri) {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 })
    const Quote = mongoose.models.Quote || mongoose.model('Quote', QuoteSchema)
    const PrintOrder = mongoose.models.PrintOrder || mongoose.model('PrintOrder', PrintOrderSchema)
    remote = await Quote.find().select('slug n src text author tags theme related rev').lean()
    printOrders = await PrintOrder.countDocuments()
  }

  const bySlug = new Map(local.map((q) => [q.slug, q]))
  for (const q of remote) {
    if (q?.slug) bySlug.set(q.slug, { ...bySlug.get(q.slug), ...q })
  }
  const merged = [...bySlug.values()].sort((a, b) => a.n - b.n)
  const seen = new Set()
  const keepers = []
  for (const row of merged) {
    const keeper = asKeeper(row)
    if (!keeper) continue
    const fp = fingerprint(keeper.text)
    if (!fp || seen.has(fp)) continue
    seen.add(fp)
    keepers.push(keeper)
  }

  const localJpgs = fs.existsSync(quotesDir)
    ? fs.readdirSync(quotesDir).filter((f) => f.endsWith('.jpg'))
    : []

  console.log(
    JSON.stringify(
      {
        apply,
        cardRevision,
        mongo: Boolean(uri),
        merged: merged.length,
        remote: remote.length,
        local: local.length,
        keepers: keepers.length,
        printOrders,
        localJpgs: localJpgs.length,
        plan: keepers.map((k, i) => ({
          n: i + 1,
          from: k.fromSlug,
          tags: k.tags,
          author: k.author || '(blank)',
          text: k.text.slice(0, 80),
        })),
      },
      null,
      2
    )
  )

  if (!apply) {
    if (uri) await mongoose.disconnect()
    return
  }

  if (!keepers.length) throw new Error('No keepers found — aborting wipe')

  const next = []
  for (let i = 0; i < keepers.length; i++) {
    const k = keepers[i]
    const n = i + 1
    const buffer = await renderQuoteCard({ n, text: k.text, author: k.author })
    fs.mkdirSync(quotesDir, { recursive: true })
    fs.writeFileSync(path.join(quotesDir, `bby${n}.jpg`), buffer)
    next.push({
      slug: `bby-${n}`,
      n,
      src: `/quotes/bby${n}.jpg`,
      text: k.text,
      author: k.author,
      tags: k.tags,
      rev: cardRevision,
      ...(k.theme ? { theme: k.theme } : {}),
    })
  }

  fs.writeFileSync(dataFile, JSON.stringify(next, null, 2) + '\n')

  for (const file of localJpgs) {
    const keep = next.some((q) => `bby${q.n}.jpg` === file)
    if (!keep) fs.unlinkSync(path.join(quotesDir, file))
  }

  if (uri) {
    const Quote = mongoose.models.Quote || mongoose.model('Quote', QuoteSchema)
    const SocialPost = mongoose.models.SocialPost || mongoose.model('SocialPost', SocialPostSchema)
    await Quote.deleteMany({})
    await Quote.insertMany(next)
    await SocialPost.deleteMany({})
    await mongoose.disconnect()
  }

  console.log(JSON.stringify({ wrote: next.map((q) => q.slug), nextN: next.length + 1 }, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
