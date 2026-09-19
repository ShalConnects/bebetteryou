/**
 * Encode a local YouTube Short preview (does not upload).
 *   node scripts/preview-short.mjs
 *   node scripts/preview-short.mjs --n 1 --out tmp/bby-short-preview.mp4
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { encodeQuoteShort, pickShortBed, pickShortStyle, quoteHook } from '../libs/social/quote-short.mjs'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const envFile = path.join(root, '.env.local')
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 1) continue
    const key = trimmed.slice(0, eq)
    let val = trimmed.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (key && !process.env[key]) process.env[key] = val
  }
}

// Footer host is stamped from SITE_URL; defaulting would brand Shorts localhost.
if (!process.env.SITE_URL) {
  console.error('SITE_URL is required — it is printed on every Short. Aborting.')
  process.exit(1)
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

const seed = quote.slug || `bby-${quote.n}`
const music = pickShortBed(Math.random, quote.tags, seed)
const style = pickShortStyle(Math.random, quote.tags, seed)
const out = path.resolve(root, arg('out', 'tmp/bby-short-preview.mp4'))
fs.mkdirSync(path.dirname(out), { recursive: true })
const { video, poster } = await encodeQuoteShort(null, quote, { music, style })
fs.writeFileSync(out, video)
const posterPath = out.replace(/\.mp4$/i, '.jpg')
if (poster?.length) fs.writeFileSync(posterPath, poster)
console.log(`Wrote ${path.relative(root, out)}`)
if (poster?.length) console.log(`Poster ${path.relative(root, posterPath)}`)
console.log(
  `Quote #${quote.n} · ${quoteHook(quote.text) || quote.slug} · ${style.id} · ${music ? path.basename(music) : 'drone'}`
)
