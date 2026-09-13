import fs from 'fs'
import path from 'path'
import { mongoUri } from '@/libs/mongo-uri'
import { logError } from '@/libs/logger'
import { mergePostRecord } from './post-log'

const dataFile = path.join(process.cwd(), 'data/social-posts.json')

function readLocal() {
  try {
    const parsed = JSON.parse(fs.readFileSync(dataFile, 'utf8'))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeLocal(rows) {
  fs.mkdirSync(path.dirname(dataFile), { recursive: true })
  fs.writeFileSync(dataFile, JSON.stringify(rows, null, 2))
}

function publicRow(row) {
  if (!row) return null
  return {
    ok: Boolean(row.ok),
    at: row.at ? new Date(row.at).toISOString() : null,
    error: row.error || '',
    url: row.url || '',
    privacy: row.privacy || '',
    channel: row.channel || '',
  }
}

async function findRemote(slug, network) {
  const { connectDB } = await import('@/libs/mongo')
  const SocialPost = (await import('@/models/SocialPost')).default
  await connectDB()
  return SocialPost.findOne({ slug, network }).lean()
}

async function upsertRemote(row) {
  const { connectDB } = await import('@/libs/mongo')
  const SocialPost = (await import('@/models/SocialPost')).default
  await connectDB()
  await SocialPost.findOneAndUpdate(
    { slug: row.slug, network: row.network },
    { $set: row },
    { upsert: true, setDefaultsOnInsert: true }
  )
}

/** Live site: Mongo. This Mac without MONGODB_URI: data/social-posts.json. */
export async function readPosts(slug) {
  const key = String(slug || '').trim()
  if (!key) return {}
  try {
    if (mongoUri()) {
      const { connectDB } = await import('@/libs/mongo')
      const SocialPost = (await import('@/models/SocialPost')).default
      await connectDB()
      const rows = await SocialPost.find({ slug: key }).lean()
      return Object.fromEntries(rows.map((row) => [row.network, publicRow(row)]))
    }
    if (process.env.VERCEL) return {}
    return Object.fromEntries(
      readLocal()
        .filter((row) => row.slug === key)
        .map((row) => [row.network, publicRow(row)])
    )
  } catch (error) {
    logError('Social post log read failed', error, { slug: key })
    return {}
  }
}

export async function recordPost(slug, result) {
  const key = String(slug || '').trim()
  const network = result?.id
  if (!key || !network) return
  try {
    if (process.env.VERCEL && !mongoUri()) {
      throw new Error('MONGODB_URI required to save social post log on Vercel')
    }
    const prev = mongoUri()
      ? await findRemote(key, network)
      : readLocal().find((row) => row.slug === key && row.network === network)
    const row = mergePostRecord(prev, { ...result, slug: key, id: network })
    if (mongoUri()) {
      await upsertRemote(row)
      return
    }
    if (process.env.VERCEL) return
    const rows = readLocal().filter((r) => !(r.slug === key && r.network === network))
    rows.push({ ...row, at: new Date(row.at).toISOString() })
    writeLocal(rows)
  } catch (error) {
    logError('Social post log write failed', error, { slug: key, network })
  }
}
