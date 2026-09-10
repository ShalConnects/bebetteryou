import fs from 'fs'
import path from 'path'
import { mongoUri } from './mongo-uri'

const dataFile = path.join(process.cwd(), 'data/scripture.json')

function readLocal() {
  try {
    return JSON.parse(fs.readFileSync(dataFile, 'utf8'))
  } catch {
    return {}
  }
}

function assertWritable() {
  if (process.env.VERCEL && !mongoUri()) {
    throw new Error('Cannot change scripture on Vercel without persistent storage')
  }
}

/** Sync read for tests. */
export function readLocalScripture() {
  return readLocal()
}

export async function readScripture() {
  const local = readLocal()
  if (!mongoUri()) return local

  try {
    const { connectDB } = await import('./mongo')
    const Scripture = (await import('@/models/Scripture')).default
    await connectDB()
    const doc = await Scripture.findOne({ key: 'catalog' }).select('data').lean()
    if (doc?.data && Object.keys(doc.data).length) return doc.data
  } catch {
    /* local fallback */
  }
  return local
}

export async function persistScripture(data) {
  assertWritable()
  if (!process.env.VERCEL) fs.writeFileSync(dataFile, JSON.stringify(data, null, 2))
  if (!mongoUri()) return

  try {
    const { connectDB } = await import('./mongo')
    const Scripture = (await import('@/models/Scripture')).default
    await connectDB()
    await Scripture.findOneAndUpdate({ key: 'catalog' }, { $set: { data } }, { upsert: true })
  } catch {
    /* Mongo optional when unavailable */
  }
}
