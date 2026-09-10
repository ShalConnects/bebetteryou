/**
 * Re-render catalog cards at the current design revision and mark them live.
 * Usage: node scripts/render-cards.mjs --n 1,3,213
 *        node scripts/render-cards.mjs --all
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { cardRevision } from '../config/quote-card.js'
import { renderQuoteCard } from '../libs/quote-card.mjs'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const catalogFile = path.join(root, 'data/quotes.json')

// The footer host is stamped from SITE_URL; defaulting would brand every card localhost.
if (!process.env.SITE_URL) {
  console.error('SITE_URL is required — it is printed on every card. Aborting.')
  process.exit(1)
}

const only = process.argv.includes('--n')
  ? new Set(process.argv[process.argv.indexOf('--n') + 1].split(',').map(Number))
  : null

const catalog = JSON.parse(fs.readFileSync(catalogFile, 'utf8'))
const targets = catalog.filter((q) => (only ? only.has(q.n) : process.argv.includes('--all')))

if (!targets.length) {
  console.error('Nothing matched. Pass --n 1,3,213 or --all.')
  process.exit(1)
}

let rendered = 0
for (const quote of targets) {
  // Legacy imports keep their words only inside the JPEG, so they cannot be redrawn.
  if (!quote.text?.trim()) {
    console.warn(`#${quote.n} skipped — no text in the catalog`)
    continue
  }

  const out = path.join(root, 'public', quote.src.replace(/^\//, ''))
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, await renderQuoteCard(quote))
  quote.rev = cardRevision
  rendered++
  console.log(`#${quote.n} -> ${quote.src}`)
}

fs.writeFileSync(catalogFile, JSON.stringify(catalog, null, 2))
console.log(`Rendered ${rendered}/${targets.length} at revision ${cardRevision}.`)
