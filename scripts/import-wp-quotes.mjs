/**
 * Import quotes: WP SQL + uploads zip → data/quotes.json + public/quotes/
 * Parses wp_posts portfolio rows; image from post_content, then thumbnail.
 * Run: npm run import:quotes
 * Tags only: npm run import:quotes -- --tags-only
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import AdmZip from 'adm-zip'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const sql = fs.readFileSync(path.join(root, 'OriginalWP/u695352597_Be_better_you.sql'), 'utf8')
const zip = new AdmZip(path.join(root, 'OriginalWP/bebetteryou.zip'))
const zipPaths = new Set(zip.getEntries().map((e) => e.entryName.replace(/\\/g, '/')))

const thumbnails = new Map()
for (const m of sql.matchAll(/\(\d+, (\d+), '_thumbnail_id', '(\d+)'\)/g)) {
  thumbnails.set(Number(m[1]), Number(m[2]))
}

const attached = new Map()
for (const m of sql.matchAll(/\(\d+, (\d+), '_wp_attached_file', '([^']+)'\)/g)) {
  attached.set(Number(m[1]), m[2].replace(/\\'/g, "'"))
}

const portfolioPostRe =
  /\((\d+), \d+, '[^']*', '[^']*', '([\s\S]*?)', 'BBY(\d+)', '', 'publish', '(?:open|closed)', '(?:open|closed)', '', '[^']*', '', '', '(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})', '[^']*', '', 0, '[^']*', 0, 'portfolio', '', 0\)/g

const imgRe = /wp-content\/uploads\/([^"']+\.(?:jpg|jpeg|png))/i

function stripSizeSuffix(rel) {
  return rel.replace(/-\d+x\d+(\.[a-z]+)$/i, '$1')
}

function relCandidates(postId, content, n) {
  const out = []
  const img = content.match(imgRe)
  if (img) out.push(stripSizeSuffix(img[1].replace(/\\'/g, "'")))
  const thumbId = thumbnails.get(postId)
  if (thumbId && attached.has(thumbId)) out.push(attached.get(thumbId))
  out.push(`2014/05/bby${n}.jpg`, `2022/06/bby${n}.jpg`)
  return [...new Set(out.filter(Boolean))]
}

function zipPathForFile(rel) {
  if (!rel) return null
  const normalized = `wp-content/uploads/${rel}`.replace(/\\/g, '/')
  if (zipPaths.has(normalized)) return normalized
  const plain = stripSizeSuffix(normalized)
  return zipPaths.has(plain) ? plain : null
}

const terms = new Map()
for (const m of sql.match(/INSERT INTO `wp_terms`[\s\S]*?;/)[0].matchAll(/\((\d+), '((?:\\'|[^'])*)', '((?:\\'|[^'])*)', \d+\)/g)) {
  terms.set(Number(m[1]), m[2].replace(/\\'/g, "'"))
}

const portfolioTax = new Map()
for (const m of sql
  .match(/INSERT INTO `wp_term_taxonomy`[\s\S]*?;/)[0]
  .matchAll(/\((\d+), (\d+), '((?:\\'|[^'])*)', '((?:\\'|[^'])*)', (\d+), (\d+)\)/g)) {
  if (m[3] === 'rara_portfolio_categories') portfolioTax.set(Number(m[1]), Number(m[2]))
}

const tagsByPost = new Map()
for (const m of sql
  .match(/INSERT INTO `wp_term_relationships`[\s\S]*?;/)[0]
  .matchAll(/\((\d+), (\d+), (\d+)\)/g)) {
  const termId = portfolioTax.get(Number(m[2]))
  if (!termId || !terms.has(termId)) continue
  const list = tagsByPost.get(Number(m[1])) || []
  list.push(terms.get(termId))
  tagsByPost.set(Number(m[1]), list)
}

const tagsOnly = process.argv.includes('--tags-only')

const byN = new Map()
let match
while ((match = portfolioPostRe.exec(sql))) {
  const postId = Number(match[1])
  const content = match[2]
  const n = Number(match[3])
  const modified = match[4]
  let entry = null
  let rel = null
  for (const candidate of relCandidates(postId, content, n)) {
    entry = zipPathForFile(candidate)
    if (entry) {
      rel = candidate
      break
    }
  }
  if (!rel) continue
  const prev = byN.get(n)
  if (!prev || modified > prev.modified) {
    byN.set(n, { n, rel, entry, modified, tags: [...new Set(tagsByPost.get(postId) || [])] })
  }
}

if (tagsOnly) {
  const file = path.join(root, 'data/quotes.json')
  const existing = JSON.parse(fs.readFileSync(file, 'utf8'))
  const tagsByN = new Map([...byN.values()].map(({ n, tags }) => [n, tags]))
  let updated = 0
  for (const q of existing) {
    const wpTags = tagsByN.get(q.n)
    if (wpTags?.length) {
      q.tags = wpTags
      updated++
    }
  }
  fs.writeFileSync(file, JSON.stringify(existing, null, 2))
  console.log(`Synced WP tags onto ${updated}/${existing.length} quotes`)
  process.exit(0)
}

const outDir = path.join(root, 'public/quotes')
fs.mkdirSync(outDir, { recursive: true })

const quotes = []
let missing = 0

for (const { n, entry, tags } of [...byN.values()].sort((a, b) => a.n - b.n)) {
  const local = `bby${n}.jpg`
  const dest = path.join(outDir, local)

  if (entry) {
    fs.writeFileSync(dest, zip.readFile(entry))
  } else {
    missing++
    continue
  }

  quotes.push({ slug: `bby-${n}`, n, src: `/quotes/${local}`, author: '', tags })
}

quotes.sort((a, b) => b.n - a.n)

fs.mkdirSync(path.join(root, 'data'), { recursive: true })
fs.writeFileSync(path.join(root, 'data/quotes.json'), JSON.stringify(quotes, null, 2))

console.log(`Imported ${quotes.length} quotes (${missing} missing from zip)`)
