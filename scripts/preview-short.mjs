/**
 * Encode a local YouTube Short preview (does not upload).
 *   node scripts/preview-short.mjs
 *   node scripts/preview-short.mjs --n 1 --out tmp/bby-short-preview.mp4
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { encodeQuoteShort, pickShortBed, quoteHook } from '../libs/social/quote-short.mjs'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const envFile = path.join(root, '.env.local')
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    if (line.startsWith('SITE_URL=') && !process.env.SITE_URL) process.env.SITE_URL = line.slice(9).trim()
  }
}

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : fallback
}

const n = Number(arg('n', '1'))
const quotes = JSON.parse(fs.readFileSync(path.join(root, 'data/quotes.json'), 'utf8'))
const quote = quotes.find((q) => q.n === n) || quotes.find((q) => q.slug === `bby-${n}`)
if (!quote) {
  console.error(`No quote #${n}`)
  process.exit(1)
}

const music = pickShortBed(Math.random, quote.tags)
const out = path.resolve(root, arg('out', 'tmp/bby-short-preview.mp4'))
fs.mkdirSync(path.dirname(out), { recursive: true })
const { video, poster } = await encodeQuoteShort(null, quote, { music })
fs.writeFileSync(out, video)
const posterPath = out.replace(/\.mp4$/i, '.jpg')
if (poster?.length) fs.writeFileSync(posterPath, poster)
console.log(`Wrote ${path.relative(root, out)}`)
if (poster?.length) console.log(`Poster ${path.relative(root, posterPath)}`)
console.log(`Quote #${quote.n} · ${quoteHook(quote.text) || quote.slug} · ${music ? path.basename(music) : 'drone'}`)
