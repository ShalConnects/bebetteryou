import fs from 'fs'
import path from 'path'
import AnalyticsEvent from '@/models/AnalyticsEvent'
import { localEventCap, summaryEventCap } from '@/config/analytics'
import { connectDB, mongoUri } from './mongo'
import { logError } from './logger'

const localFile = path.join(process.cwd(), 'data/analytics-events.json')

function mongoBacked() {
  return Boolean(mongoUri())
}

/** Mongo when the URI is real; local JSON off Vercel, same split as print orders. */
export function analyticsReady() {
  return mongoBacked() || !process.env.VERCEL
}

function readLocal() {
  try {
    const parsed = JSON.parse(fs.readFileSync(localFile, 'utf8'))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeLocal(events) {
  fs.mkdirSync(path.dirname(localFile), { recursive: true })
  fs.writeFileSync(localFile, JSON.stringify(events.slice(0, localEventCap), null, 2))
}

/**
 * Never throws. A dropped pageview is not worth failing a request over, and the
 * ingest route answers before anyone is waiting on the result anyway.
 */
export async function recordEvent(event) {
  const row = { ...event, createdAt: event.createdAt || new Date() }
  try {
    if (mongoBacked()) {
      await connectDB()
      await AnalyticsEvent.create(row)
      return true
    }
    if (!analyticsReady()) return false
    writeLocal([{ ...row, createdAt: new Date(row.createdAt).toISOString() }, ...readLocal()])
    return true
  } catch (error) {
    logError('Analytics write failed', error, { name: event?.name })
    return false
  }
}

/** Newest first, capped — the dashboard summarises whatever it gets back. */
export async function listEvents({ since, limit = summaryEventCap } = {}) {
  try {
    if (mongoBacked()) {
      await connectDB()
      return AnalyticsEvent.find(since ? { createdAt: { $gte: since } } : {})
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean()
    }
    if (!analyticsReady()) return []
    const cutoff = since ? new Date(since).getTime() : 0
    return readLocal()
      .filter((event) => new Date(event.createdAt).getTime() >= cutoff)
      .slice(0, limit)
  } catch (error) {
    logError('Analytics read failed', error)
    return []
  }
}
