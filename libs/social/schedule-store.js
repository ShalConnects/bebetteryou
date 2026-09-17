import fs from 'fs'
import path from 'path'
import { mongoUri } from '@/libs/mongo-uri'
import { logError } from '@/libs/logger'

const dataFile = path.join(process.cwd(), 'data/social-schedules.json')

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
    id: String(row._id || row.id),
    slug: row.slug,
    networks: Array.isArray(row.networks) ? row.networks : [],
    runAt: row.runAt ? new Date(row.runAt).toISOString() : null,
    status: row.status || 'pending',
    error: row.error || '',
    results: row.results || null,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
  }
}

async function model() {
  const { connectDB } = await import('@/libs/mongo')
  const SocialSchedule = (await import('@/models/SocialSchedule')).default
  await connectDB()
  return SocialSchedule
}

/** Upcoming + recent schedules for one quote, newest first. */
export async function listSchedules(slug) {
  const key = String(slug || '').trim()
  if (!key) return []
  try {
    if (mongoUri()) {
      const SocialSchedule = await model()
      const rows = await SocialSchedule.find({ slug: key }).sort({ runAt: -1 }).limit(20).lean()
      return rows.map(publicRow)
    }
    if (process.env.VERCEL) return []
    return readLocal()
      .filter((row) => row.slug === key)
      .sort((a, b) => new Date(b.runAt) - new Date(a.runAt))
      .slice(0, 20)
      .map(publicRow)
  } catch (error) {
    logError('Social schedule list failed', error, { slug: key })
    return []
  }
}

/** All schedules across quotes — pending first, then by runAt. */
export async function listAllSchedules({ limit = 100 } = {}) {
  try {
    if (mongoUri()) {
      const SocialSchedule = await model()
      const rows = await SocialSchedule.find()
        .sort({ status: 1, runAt: 1 })
        .limit(limit)
        .lean()
      return rows
        .map(publicRow)
        .sort((a, b) => {
          const pending = Number(b.status === 'pending') - Number(a.status === 'pending')
          if (pending) return pending
          return new Date(a.runAt) - new Date(b.runAt)
        })
    }
    if (process.env.VERCEL) return []
    return readLocal()
      .map(publicRow)
      .sort((a, b) => {
        const pending = Number(b.status === 'pending') - Number(a.status === 'pending')
        if (pending) return pending
        return new Date(a.runAt) - new Date(b.runAt)
      })
      .slice(0, limit)
  } catch (error) {
    logError('Social schedule list-all failed', error)
    return []
  }
}

export async function createSchedule({ slug, networks, runAt }) {
  const key = String(slug || '').trim()
  const when = new Date(runAt)
  const nets = [...new Set((networks || []).map(String).filter(Boolean))]
  if (!key) throw new Error('slug required')
  if (!nets.length) throw new Error('networks required')
  if (Number.isNaN(when.getTime())) throw new Error('Invalid schedule time')
  if (when.getTime() < Date.now() - 60_000) throw new Error('Schedule time must be in the future')

  const row = {
    slug: key,
    networks: nets,
    runAt: when,
    status: 'pending',
    error: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  if (mongoUri()) {
    const SocialSchedule = await model()
    const saved = await SocialSchedule.create(row)
    return publicRow(saved.toObject())
  }
  if (process.env.VERCEL) throw new Error('MONGODB_URI required to schedule posts on Vercel')

  const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const local = { ...row, id, runAt: when.toISOString(), createdAt: row.createdAt.toISOString() }
  const rows = readLocal()
  rows.push(local)
  writeLocal(rows)
  return publicRow(local)
}

export async function cancelSchedule(id) {
  const key = String(id || '').trim()
  if (!key) throw new Error('id required')

  if (mongoUri()) {
    const SocialSchedule = await model()
    const row = await SocialSchedule.findById(key)
    if (!row) throw new Error('Schedule not found')
    if (row.status !== 'pending') throw new Error('Only pending schedules can be canceled')
    row.status = 'canceled'
    row.updatedAt = new Date()
    await row.save()
    return publicRow(row.toObject())
  }
  if (process.env.VERCEL) throw new Error('MONGODB_URI required to cancel schedules on Vercel')

  const rows = readLocal()
  const i = rows.findIndex((r) => String(r.id) === key)
  if (i < 0) throw new Error('Schedule not found')
  if (rows[i].status !== 'pending') throw new Error('Only pending schedules can be canceled')
  rows[i] = { ...rows[i], status: 'canceled', updatedAt: new Date().toISOString() }
  writeLocal(rows)
  return publicRow(rows[i])
}

/** Claim due pending jobs (status → running). Local file is best-effort. */
export async function claimDueSchedules(now = new Date(), limit = 5) {
  if (mongoUri()) {
    const SocialSchedule = await model()
    const due = await SocialSchedule.find({ status: 'pending', runAt: { $lte: now } })
      .sort({ runAt: 1 })
      .limit(limit)
      .lean()
    const claimed = []
    for (const row of due) {
      const next = await SocialSchedule.findOneAndUpdate(
        { _id: row._id, status: 'pending' },
        { $set: { status: 'running', updatedAt: new Date() } },
        { new: true }
      ).lean()
      if (next) claimed.push(next)
    }
    return claimed
  }
  if (process.env.VERCEL) return []

  const rows = readLocal()
  const claimed = []
  for (const row of rows) {
    if (claimed.length >= limit) break
    if (row.status !== 'pending') continue
    if (new Date(row.runAt).getTime() > now.getTime()) continue
    row.status = 'running'
    row.updatedAt = now.toISOString()
    claimed.push({ ...row })
  }
  writeLocal(rows)
  return claimed
}

export async function finishSchedule(id, { ok, results, error = '' }) {
  const key = String(id || '').trim()
  if (mongoUri()) {
    const SocialSchedule = await model()
    const row = await SocialSchedule.findByIdAndUpdate(
      key,
      {
        $set: {
          status: ok ? 'done' : 'failed',
          results: results || [],
          error: ok ? '' : String(error || 'Failed'),
          updatedAt: new Date(),
        },
      },
      { new: true }
    ).lean()
    return publicRow(row)
  }
  if (process.env.VERCEL) return null

  const rows = readLocal()
  const i = rows.findIndex((r) => String(r.id || r._id) === key)
  if (i < 0) return null
  rows[i] = {
    ...rows[i],
    status: ok ? 'done' : 'failed',
    results: results || [],
    error: ok ? '' : String(error || 'Failed'),
    updatedAt: new Date().toISOString(),
  }
  writeLocal(rows)
  return publicRow(rows[i])
}
