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

const gridFile = path.join(dir, 'topics.json')

/** pSEO grid: `{ topics, modifiers }` — drives hub filters and batch generation. */
export function readGrid() {
  const grid = readJson(gridFile, null)
  return {
    topics: Array.isArray(grid?.topics) ? grid.topics.filter((t) => t?.id) : [],
    modifiers: Array.isArray(grid?.modifiers) ? grid.modifiers.filter((m) => m?.id) : [],
  }
}

function writeGrid(grid) {
  if (process.env.VERCEL) return
  fs.writeFileSync(gridFile, JSON.stringify(grid, null, 2) + '\n')
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n')
}

/** Remap `post.tag` on each post file (rename / delete). */
export function mapPostTags(mapper) {
  if (process.env.VERCEL) return 0
  const files = fs.existsSync(postsDir) ? fs.readdirSync(postsDir) : []
  let changed = 0
  for (const f of files) {
    if (!f.endsWith('.json')) continue
    const file = path.join(postsDir, f)
    const post = readJson(file, null)
    if (!post?.slug) continue
    const prev = post.tag || ''
    const tag = mapper(prev)
    if (tag === prev) continue
    if (tag) post.tag = tag
    else delete post.tag
    writeJson(file, post)
    changed += 1
  }
  if (changed) cache = null
  return changed
}

/** Remap topic → catalog tag (rename / delete). Returns how many topics changed. */
export function mapTopicTags(mapper) {
  const grid = readGrid()
  let changed = 0
  const topics = grid.topics.map((t) => {
    const prev = t.tag || ''
    const tag = mapper(prev)
    if (tag === prev) return t
    changed += 1
    return tag ? { ...t, tag } : { id: t.id, label: t.label }
  })
  if (changed) writeGrid({ ...grid, topics })
  return changed
}
