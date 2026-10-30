import fs from 'fs'
import path from 'path'
import { mongoUri } from '@/libs/mongo-uri'
import { logError } from '@/libs/logger'
import { utcDayRange } from '@/libs/social/schedule-store'
import { mergePostRecord } from './post-log'

const dataFile = path.join(process.cwd(), 'data/social-posts.json')
/** Posts logged under a made-up key, not a quote slug: week reviews and verse Shorts. */
export const derivedSlug = /^(week|verse)-/

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
    manual: Boolean(row.manual),
    thumbnailError: row.thumbnailError || '',
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

/** `{ [slug]: { [network]: publicRow } }` for many quotes (Failures resolution). */
export async function readPostsBySlugs(slugs) {
  const keys = [...new Set((slugs || []).map((s) => String(s || '').trim()).filter(Boolean))]
  if (!keys.length) return {}
  try {
    if (mongoUri()) {
      const { connectDB } = await import('@/libs/mongo')
      const SocialPost = (await import('@/models/SocialPost')).default
      await connectDB()
      const rows = await SocialPost.find({ slug: { $in: keys } }).lean()
      const out = Object.fromEntries(keys.map((k) => [k, {}]))
      for (const row of rows) {
        if (!out[row.slug]) out[row.slug] = {}
        out[row.slug][row.network] = publicRow(row)
      }
      return out
    }
    if (process.env.VERCEL) return {}
    const want = new Set(keys)
    const out = Object.fromEntries(keys.map((k) => [k, {}]))
    for (const row of readLocal()) {
      if (!want.has(row.slug)) continue
      out[row.slug][row.network] = publicRow(row)
    }
    return out
  } catch (error) {
    logError('Social post log batch read failed', error)
    return {}
  }
}

/**
 * Unique quote slugs with successful social posts.
 * Optional `since`/`until` on post time. Excludes week-review and verse keys.
 * `minNetworks` drops one-off test posts (e.g. LinkedIn-only) from week-in-review.
 * Returns `{ slug, at, networks }[]` newest-first.
 */
export async function listPostedQuoteSlugs({ since, until, minNetworks = 1 } = {}) {
  const start = since ? new Date(since).getTime() : null
  const end = until ? new Date(until).getTime() : null
  const min = Math.max(1, Number(minNetworks) || 1)

  function inRange(at) {
    const t = new Date(at).getTime()
    if (!Number.isFinite(t)) return false
    if (start != null && t < start) return false
    if (end != null && t > end) return false
    return true
  }

  try {
    let rows = []
    if (mongoUri()) {
      const { connectDB } = await import('@/libs/mongo')
      const SocialPost = (await import('@/models/SocialPost')).default
      await connectDB()
      const q = { ok: true, slug: { $not: derivedSlug } }
      if (start != null || end != null) {
        q.at = {}
        if (start != null) q.at.$gte = new Date(start)
        if (end != null) q.at.$lte = new Date(end)
      }
      rows = await SocialPost.find(q).select('slug at network').lean()
    } else if (!process.env.VERCEL) {
      rows = readLocal().filter(
        (row) => row.ok && row.slug && !derivedSlug.test(row.slug) && inRange(row.at)
      )
    }

    const best = new Map()
    for (const row of rows) {
      const slug = String(row.slug || '').trim()
      if (!slug) continue
      const network = String(row.network || '').trim()
      const at = row.at ? new Date(row.at).toISOString() : null
      const prev = best.get(slug) || { slug, at: null, networks: new Set() }
      if (network) prev.networks.add(network)
      if (at && (!prev.at || at > prev.at)) prev.at = at
      best.set(slug, prev)
    }

    return [...best.values()]
      .filter((row) => row.networks.size >= min)
      .map((row) => ({ slug: row.slug, at: row.at, networks: row.networks.size }))
      .sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')))
  } catch (error) {
    logError('Social post slug list failed', error)
    return []
  }
}

/**
 * True when `network` has a successful post in the UTC calendar day of `now`.
 * Optional `excludeSlugPrefix` skips week-review style jobs (e.g. `week-`).
 */
export async function hasOkNetworkPostInUtcDay(
  network,
  { now = new Date(), excludeSlugPrefix = '' } = {}
) {
  const key = String(network || '').trim()
  if (!key) return false
  const { start, end } = utcDayRange(now)
  const prefix = String(excludeSlugPrefix || '')

  try {
    if (mongoUri()) {
      const { connectDB } = await import('@/libs/mongo')
      const SocialPost = (await import('@/models/SocialPost')).default
      await connectDB()
      const q = {
        network: key,
        ok: true,
        at: { $gte: start, $lt: end },
      }
      if (prefix) q.slug = { $not: new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) }
      const row = await SocialPost.findOne(q).select('slug').lean()
      return Boolean(row?.slug)
    }
    if (process.env.VERCEL) return false

    const startMs = start.getTime()
    const endMs = end.getTime()
    return readLocal().some((row) => {
      if (row.network !== key || !row.ok) return false
      if (prefix && String(row.slug || '').startsWith(prefix)) return false
      const t = new Date(row.at).getTime()
      return Number.isFinite(t) && t >= startMs && t < endMs
    })
  } catch (error) {
    logError('Social post day check failed', error, { network: key })
    return false
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
