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
