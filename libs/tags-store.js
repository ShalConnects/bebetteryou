import fs from 'fs'
import path from 'path'
import { tagSeed } from '@/config/quotes'
import { mongoUri } from './mongo'

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

function tagRecord(name, moodLabel = '') {
  const mood = String(moodLabel ?? '').trim()
  return { name, ...(mood ? { moodLabel: mood } : {}) }
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

export async function addTag(rawName, moodLabel = '') {
  const name = normalizeTagName(rawName)
  const tags = await readTags()
  if (findTagIndex(tags, name) >= 0) throw new Error('Tag already exists')
  const next = [...tags, tagRecord(name, moodLabel)]
  await persistTags(next)
  return next
}

export async function updateTag(oldName, { name: rawName, moodLabel } = {}) {
  const tags = await readTags()
  const i = findTagIndex(tags, oldName)
  if (i < 0) throw new Error('Tag not found')

  const prev = tags[i]
  const name = rawName !== undefined ? normalizeTagName(rawName) : prev.name
  const mood = moodLabel !== undefined ? String(moodLabel).trim() : prev.moodLabel || ''

  if (name.toLowerCase() !== prev.name.toLowerCase() && findTagIndex(tags, name) >= 0) {
    throw new Error('Tag already exists')
  }

  const next = [...tags]
  next[i] = tagRecord(name, mood)
  await persistTags(next)
  return { tags: next, renamed: name !== prev.name, from: prev.name, to: name }
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
