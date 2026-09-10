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

export async function listTagsWithUsage() {
  const [tags, quotes] = await Promise.all([readTags(), readQuotes()])
  const counts = {}
  for (const q of quotes) for (const t of q.tags || []) counts[t] = (counts[t] || 0) + 1
  return tags.map((t) => ({ ...t, count: counts[t.name] || 0 }))
}

export async function createTag(name, moodLabel) {
  return addTag(name, moodLabel)
}

export async function editTag(oldName, patch) {
  const { tags, renamed, from, to } = await updateTag(oldName, patch)
  if (renamed) await mapQuoteTags((ts) => ts.map((t) => (t === from ? to : t)))
  return tags
}

export async function deleteTag(name) {
  const { tags, removed } = await removeTag(name)
  await mapQuoteTags((ts) => ts.filter((t) => t !== removed))
  return tags
}
