/**
 * Generate a quote card JPEG.
 * Usage: node scripts/generate-quote.mjs --n 1 --text "Be yourself,\nWorld will\nADJUST."
 * Optional: --author Unknown --out public/quotes/bby1.jpg
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { renderQuoteCard } from '../libs/quote-card.mjs'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

const samples = {
  1: { text: 'Be yourself,\nWorld will\nADJUST.', author: 'Unknown' },
  2: { text: 'Never sacrifice:\nYour family\nYour dignity\nYourself!', author: 'Unknown' },
  3: {
    text: "You're going to Love some\npeople on the way,\nbut remember that not everyone\nis intended to go with you.",
    author: 'Unknown',
  },
}

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : fallback
}

const n = Number(arg('n', '1'))
const sample = samples[n] || {}
const text = (arg('text', sample.text || '') || '').replace(/\\n/g, '\n')
const author = arg('author', sample.author || '')
const out = arg('out', path.join(root, `public/quotes/bby${n}.jpg`))

if (!text) {
  console.error('Missing --text (or use --n 1|2|3 for built-in samples)')
  process.exit(1)
}

fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, await renderQuoteCard({ n, text, author }))
console.log(`Wrote ${path.relative(root, out)}`)
