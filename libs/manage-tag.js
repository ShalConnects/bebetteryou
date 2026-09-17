import { revalidatePath } from 'next/cache'
import { mapPostTags, mapTopicTags, readGrid, readPosts } from '@/libs/blog-store'
import { mapBookTags, readBooks } from '@/libs/books-store'
import { readScripture, persistScripture } from '@/libs/scripture-store'
import { themeEntries } from '@/libs/scripture-core'
import { retargetName, retargetNames, themeSet } from '@/libs/tag-lane'
import { appendQuote, readQuotes } from './quotes-store'
import { addTag, readTags, removeTag, updateTag } from './tags-store'

async function mapQuoteTags(mapper) {
  for (const q of await readQuotes()) {
    const tags = q.tags || []
    const next = mapper(tags)
    if (next.length !== tags.length || next.some((t, i) => t !== tags[i])) {
      await appendQuote({ ...q, tags: next })
    }
  }
}

async function remapTagName(from, to) {
  const one = retargetName(from, to)
  const many = retargetNames(from, to)
  mapTopicTags(one)
  mapPostTags(one)
  mapBookTags(many)
  await mapQuoteTags(many)
}

/** Move or drop scripture when no remaining tag still uses `from`. */
async function syncScriptureTheme(from, to, remainingTags) {
  if (!from || from === to || themeSet(remainingTags).has(from)) return
  const data = await readScripture()
  let changed = false
  for (const trad of Object.keys(data)) {
    const bucket = data[trad]
    if (!bucket || bucket[from] === undefined) continue
    if (to) bucket[to] = [...themeEntries(bucket[from]), ...themeEntries(bucket[to])]
    delete bucket[from]
    if (!Object.keys(bucket).length) delete data[trad]
    changed = true
  }
  if (changed) await persistScripture(data)
}

function passageCount(book, theme) {
  if (!theme) return 0
  return Object.values(book || {}).reduce((n, themes) => n + themeEntries(themes?.[theme]).length, 0)
}

export function revalidateTags() {
  for (const path of ['/', '/quotes', '/blog', '/books', '/dashboard/quotes', '/dashboard/tags']) {
    revalidatePath(path, 'layout')
  }
}

export async function listTagsWithUsage() {
  const [tags, quotes, book] = await Promise.all([readTags(), readQuotes(), readScripture()])
  const quoteCounts = {}
  for (const q of quotes) for (const t of q.tags || []) quoteCounts[t] = (quoteCounts[t] || 0) + 1

  const topicTag = Object.fromEntries(readGrid().topics.filter((t) => t.tag).map((t) => [t.id, t.tag]))
  const postCounts = {}
  for (const p of readPosts()) {
    const tag = p.tag || topicTag[p.topic]
    if (tag) postCounts[tag] = (postCounts[tag] || 0) + 1
  }
  const bookCounts = {}
  for (const b of readBooks()) for (const t of b.tags || []) bookCounts[t] = (bookCounts[t] || 0) + 1

  return tags.map((t) => ({
    ...t,
    quotes: quoteCounts[t.name] || 0,
    posts: postCounts[t.name] || 0,
    books: bookCounts[t.name] || 0,
    passages: passageCount(book, t.theme),
    /** @deprecated use `quotes` — kept for older UI callers */
    count: quoteCounts[t.name] || 0,
  }))
}

export async function createTag(name, patch = {}) {
  return addTag(name, typeof patch === 'string' ? { moodLabel: patch } : patch)
}

export async function editTag(oldName, patch) {
  const { tags, renamed, from, to, themeFrom, themeTo } = await updateTag(oldName, patch)
  if (renamed) await remapTagName(from, to)
  if (themeFrom !== themeTo) await syncScriptureTheme(themeFrom, themeTo, tags)
  return tags
}

export async function deleteTag(name) {
  const { tags, removed, theme } = await removeTag(name)
  await remapTagName(removed, '')
  await syncScriptureTheme(theme, '', tags)
  return tags
}
