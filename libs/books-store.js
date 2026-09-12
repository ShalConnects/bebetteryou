import fs from 'fs'
import path from 'path'

const postsDir = path.join(process.cwd(), 'data/books')

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return fallback
  }
}

let cache = null

/** Every row in data/books. Directory is the index. Cached outside dev. */
export function readBooks() {
  if (cache) return cache
  const files = fs.existsSync(postsDir) ? fs.readdirSync(postsDir) : []
  const books = files
    .filter((f) => f.endsWith('.json'))
    .map((f) => readJson(path.join(postsDir, f), null))
    .filter((b) => b?.slug && b.title)
  if (process.env.NODE_ENV !== 'development') cache = books
  return books
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n')
}

/** Remap `book.tags` on each book file (rename / delete). */
export function mapBookTags(mapper) {
  if (process.env.VERCEL) return 0
  const files = fs.existsSync(postsDir) ? fs.readdirSync(postsDir) : []
  let changed = 0
  for (const f of files) {
    if (!f.endsWith('.json')) continue
    const file = path.join(postsDir, f)
    const book = readJson(file, null)
    if (!book?.slug) continue
    const tags = book.tags || []
    const next = mapper(tags)
    if (next.length === tags.length && next.every((t, i) => t === tags[i])) continue
    book.tags = next
    writeJson(file, book)
    changed += 1
  }
  if (changed) cache = null
  return changed
}
