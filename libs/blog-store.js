import fs from 'fs'
import path from 'path'

const dir = path.join(process.cwd(), 'data/blog')
const postsDir = path.join(dir, 'posts')

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return fallback
  }
}

let cache = null

/**
 * Every row in data/blog/posts. The directory *is* the index — no second file to
 * drift. Cached outside dev so a build reads each row once.
 */
export function readPosts() {
  if (cache) return cache
  const files = fs.existsSync(postsDir) ? fs.readdirSync(postsDir) : []
  const posts = files
    .filter((f) => f.endsWith('.json'))
    .map((f) => readJson(path.join(postsDir, f), null))
    .filter((p) => p?.slug && p.title)
  if (process.env.NODE_ENV !== 'development') cache = posts
  return posts
}

/** pSEO grid: `{ topics, modifiers }` — drives hub filters and batch generation. */
export function readGrid() {
  const grid = readJson(path.join(dir, 'topics.json'), null)
  return {
    topics: Array.isArray(grid?.topics) ? grid.topics.filter((t) => t?.id) : [],
    modifiers: Array.isArray(grid?.modifiers) ? grid.modifiers.filter((m) => m?.id) : [],
  }
}
