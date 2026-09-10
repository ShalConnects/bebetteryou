import { mapTopicTags, readGrid, readPosts } from '@/libs/blog-store'
import { readScripture, persistScripture } from '@/libs/scripture-store'
import { themeEntries } from '@/libs/scripture-core'
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

/** Move scripture rows when a lane's theme slug changes. */
async function renameScriptureTheme(from, to) {
  if (!from || !to || from === to) return
  const data = await readScripture()
  let changed = false
  for (const trad of Object.keys(data)) {
    const bucket = data[trad]
    if (!bucket || bucket[from] === undefined) continue
    const merged = [...themeEntries(bucket[from]), ...themeEntries(bucket[to])]
    bucket[to] = merged
    delete bucket[from]
    changed = true
  }
  if (changed) await persistScripture(data)
}

function passageCount(book, theme) {
  if (!theme) return 0
  return Object.values(book || {}).reduce((n, themes) => n + themeEntries(themes?.[theme]).length, 0)
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

  return tags.map((t) => ({
    ...t,
    quotes: quoteCounts[t.name] || 0,
    posts: postCounts[t.name] || 0,
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
  if (renamed) {
    await mapQuoteTags((ts) => ts.map((t) => (t === from ? to : t)))
    mapTopicTags((tag) => (tag === from ? to : tag))
  }
  if (themeFrom !== themeTo) await renameScriptureTheme(themeFrom, themeTo)
  return tags
}

export async function deleteTag(name) {
  const { tags, removed } = await removeTag(name)
  await mapQuoteTags((ts) => ts.filter((t) => t !== removed))
  mapTopicTags((tag) => (tag === removed ? '' : tag))
  return tags
}
