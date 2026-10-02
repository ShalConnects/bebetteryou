/**
 * Push local catalog `rev` (and slug match) into Mongo so publicQuotes() can see cards.
 * Does not re-render JPEGs.
 *
 *   node --env-file=.env.local scripts/sync-quote-rev.mjs
 *   node --env-file=.env.local scripts/sync-quote-rev.mjs --apply
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { cardRevision } from '../config/quote-card.js'
import { mongoUri } from '../libs/mongo-uri.js'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const catalogFile = path.join(root, 'data/quotes.json')
const apply = process.argv.includes('--apply')

const uri = mongoUri()
if (!uri) {
  console.error('MONGODB_URI missing — aborting.')
  process.exit(1)
}

const catalog = JSON.parse(fs.readFileSync(catalogFile, 'utf8'))
if (!Array.isArray(catalog) || !catalog.length) {
  console.error('data/quotes.json is empty — aborting.')
  process.exit(1)
}

const { default: mongoose } = await import('mongoose')
await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 })
const Quote = mongoose.models.Quote || mongoose.model('Quote', new mongoose.Schema({
  slug: String,
  n: Number,
  src: String,
  text: String,
  author: String,
  tags: [String],
  theme: String,
  rev: Number,
  related: mongoose.Schema.Types.Mixed,
  createdAt: Date,
}, { collection: 'quotes', strict: false }))

const remote = await Quote.find().select('slug n rev').lean()
const bySlug = new Map(remote.map((q) => [q.slug, q]))

let would = 0
let missing = 0
const plan = []

for (const local of catalog) {
  if (!local?.slug) continue
  const targetRev = local.rev ?? cardRevision
  const remoteRow = bySlug.get(local.slug)
  if (!remoteRow) {
    missing++
    plan.push({ slug: local.slug, n: local.n, action: 'upsert', from: null, to: targetRev })
    continue
  }
  if (remoteRow.rev === targetRev) continue
  would++
  plan.push({ slug: local.slug, n: local.n, action: 'update', from: remoteRow.rev ?? null, to: targetRev })
}

console.log(`cardRevision=${cardRevision}`)
console.log(`local catalog=${catalog.length}  mongo=${remote.length}`)
console.log(`need update=${would}  missing in mongo=${missing}`)
for (const row of plan) {
  console.log(`  #${row.n} ${row.slug}: ${row.action} rev ${row.from} → ${row.to}`)
}

if (!apply) {
  console.log('\nDry-run only. Re-run with --apply to write Mongo.')
  await mongoose.disconnect()
  process.exit(0)
}

let updated = 0
for (const local of catalog) {
  if (!local?.slug) continue
  const targetRev = local.rev ?? cardRevision
  const res = await Quote.updateOne(
    { slug: local.slug },
    {
      $set: {
        n: local.n,
        src: local.src,
        text: local.text,
        author: local.author || '',
        tags: local.tags || [],
        ...(local.theme ? { theme: local.theme } : {}),
        rev: targetRev,
      },
    },
    { upsert: true }
  )
  if (res.modifiedCount || res.upsertedCount) updated++
}

const after = await Quote.find().select('slug rev').lean()
const live = after.filter((q) => q.rev === cardRevision).length
console.log(`\nWrote ${updated} docs. Mongo rows at rev ${cardRevision}: ${live}/${after.length}`)
await mongoose.disconnect()
