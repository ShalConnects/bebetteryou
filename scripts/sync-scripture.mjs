/**
 * Push the reviewed scripture catalog (data/scripture.json) and card theme pins
 * (data/quote-themes.json) to Mongo, which the live site reads instead of the files.
 *
 *   node --env-file=.env.local scripts/sync-scripture.mjs          # dry run
 *   node --env-file=.env.local scripts/sync-scripture.mjs --apply
 */
import fs from 'fs'
import mongoose from 'mongoose'

const apply = process.argv.includes('--apply')
const read = (file) => JSON.parse(fs.readFileSync(new URL(`../data/${file}`, import.meta.url), 'utf8'))
const count = (book) =>
  Object.values(book || {}).reduce((n, themes) => n + Object.values(themes).flat().length, 0)

const book = read('scripture.json')
const pins = read('quote-themes.json')
await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 })
const scriptures = mongoose.connection.db.collection('scriptures')
const quotes = mongoose.connection.db.collection('quotes')

const current = await scriptures.findOne({ key: 'catalog' })
console.log(`Scripture: Mongo has ${count(current?.data)} passages, file has ${count(book)}.`)
for (const [slug, theme] of Object.entries(pins)) {
  const quote = await quotes.findOne({ slug }, { projection: { theme: 1 } })
  console.log(`  ${slug}: ${quote?.theme || '(from tags)'} → ${theme}${quote ? '' : '  [not in Mongo — skipped]'}`)
}

if (apply) {
  await scriptures.updateOne({ key: 'catalog' }, { $set: { data: book } }, { upsert: true })
  for (const [slug, theme] of Object.entries(pins)) await quotes.updateOne({ slug }, { $set: { theme } })
  console.log('Applied.')
} else {
  console.log('Dry run only. Re-run with --apply to write.')
}
await mongoose.disconnect()
