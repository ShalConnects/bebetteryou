import fs from 'fs'
import path from 'path'
import { tagSeed } from '@/config/quotes'
import { tagFields } from '@/libs/tag-lane'
import { mongoUri } from './mongo-uri'

const dataFile = path.join(process.cwd(), 'data/tags.json')

function asTags(data) {
  return Array.isArray(data) ? data.filter((t) => t?.name) : []
}

function readLocal() {
  try {
    return asTags(JSON.parse(fs.readFileSync(dataFile, 'utf8')))
  } catch {
    return []
  }
}

function assertWritable() {
  if (process.env.VERCEL && !mongoUri()) {
    throw new Error('Cannot change tags on Vercel without persistent storage')
  }
}

async function readRemote() {
  if (!mongoUri()) return null
  try {
    const { connectDB } = await import('./mongo')
    const TagCatalog = (await import('@/models/TagCatalog')).default
    await connectDB()
    const doc = await TagCatalog.findOne({ key: 'catalog' }).select('tags').lean()
    return doc?.tags?.length ? asTags(doc.tags) : null
  } catch {
    return null
  }
}

export async function persistTags(tags) {
  assertWritable()
  const list = asTags(tags)
  if (!process.env.VERCEL) fs.writeFileSync(dataFile, JSON.stringify(list, null, 2))
  if (!mongoUri()) return

  try {
    const { connectDB } = await import('./mongo')
    const TagCatalog = (await import('@/models/TagCatalog')).default
    await connectDB()
    await TagCatalog.findOneAndUpdate({ key: 'catalog' }, { $set: { tags: list } }, { upsert: true })
  } catch {
    /* Mongo optional when unavailable */
  }
}

export function tagNames(tags) {
  return asTags(tags).map((t) => t.name)
}

/** Tags with moodLabel → surprise / mood UI. */
export function moodIntents(tags) {
  return asTags(tags)
    .filter((t) => t.moodLabel)
    .map((t) => ({ tag: t.name, label: t.moodLabel }))
}

export function normalizeTagName(raw) {
  const name = String(raw ?? '')
    .trim()
    .replace(/\s+/g, ' ')
  if (!name) throw new Error('tag required')
  return name.replace(/\b([a-z])/g, (m) => m.toUpperCase())
}

export function findTagIndex(tags, name) {
  const key = String(name ?? '').toLowerCase()
  return asTags(tags).findIndex((t) => t.name.toLowerCase() === key)
}

function record(name, patch = {}) {
  return tagFields({ name, moodLabel: patch.moodLabel ?? '', theme: patch.theme ?? '', hashtags: patch.hashtags ?? '' })
}

/** Local JSON + optional Mongo catalog (remote wins). */
export async function readTags() {
  let tags = readLocal()
  if (!tags.length) {
    tags = tagSeed.map((t) => ({ ...t }))
    if (!process.env.VERCEL) fs.writeFileSync(dataFile, JSON.stringify(tags, null, 2))
  }
  const remote = await readRemote()
  return remote ?? tags
}

export async function addTag(rawName, patch = {}) {
  const name = normalizeTagName(rawName)
  const tags = await readTags()
  if (findTagIndex(tags, name) >= 0) throw new Error('Tag already exists')
  const next = [...tags, record(name, patch)]
  await persistTags(next)
  return next
}

export async function updateTag(oldName, patch = {}) {
  const tags = await readTags()
  const i = findTagIndex(tags, oldName)
  if (i < 0) throw new Error('Tag not found')

  const prev = tags[i]
  const name = patch.name !== undefined ? normalizeTagName(patch.name) : prev.name
  if (name.toLowerCase() !== prev.name.toLowerCase() && findTagIndex(tags, name) >= 0) {
    throw new Error('Tag already exists')
  }

  const next = [...tags]
  next[i] = record(name, {
    moodLabel: patch.moodLabel !== undefined ? patch.moodLabel : prev.moodLabel || '',
    theme: patch.theme !== undefined ? patch.theme : prev.theme || '',
    hashtags: patch.hashtags !== undefined ? patch.hashtags : prev.hashtags || '',
  })
  await persistTags(next)
  return {
    tags: next,
    renamed: name !== prev.name,
    from: prev.name,
    to: name,
    themeFrom: prev.theme || '',
    themeTo: next[i].theme || '',
  }
}

export async function removeTag(name) {
  const tags = await readTags()
  const i = findTagIndex(tags, name)
  if (i < 0) throw new Error('Tag not found')
  const removed = tags[i].name
  const next = tags.filter((_, j) => j !== i)
  await persistTags(next)
  return { tags: next, removed }
}
