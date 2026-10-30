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

/** Only what `summarize` reads — rows stay small even near the cap. */
const summaryFields = 'name path slug target channel source visitor device country createdAt'

const timeRange = (since, until) => ({
  ...(since || until ? { createdAt: { ...(since && { $gte: since }), ...(until && { $lt: until }) } } : {}),
})

const inWindow = (since, until) => (event) => {
  const t = new Date(event.createdAt).getTime()
  return (!since || t >= new Date(since).getTime()) && (!until || t < new Date(until).getTime())
}

/** Newest first in [since, until), capped — the dashboard summarises whatever it gets back. */
export async function listEvents({ since, until, limit = summaryEventCap } = {}) {
  try {
    if (mongoBacked()) {
      await connectDB()
      return AnalyticsEvent.find(timeRange(since, until)).select(summaryFields).sort({ createdAt: -1 }).limit(limit).lean()
    }
    if (!analyticsReady()) return []
    return readLocal().filter(inWindow(since, until)).slice(0, limit)
  } catch (error) {
    logError('Analytics read failed', error)
    return []
  }
}

/** Unique visitor ids in [since, until), counted in the database (no id list, so no 16MB result cap). */
export async function countVisitors(since, until) {
  if (mongoBacked()) {
    await connectDB()
    const [row] = await AnalyticsEvent.aggregate([
      { $match: timeRange(since, until) },
      { $group: { _id: '$visitor' } },
      { $count: 'n' },
    ])
    return row?.n || 0
  }
  return analyticsReady() ? new Set(readLocal().filter(inWindow(since, until)).map((e) => e.visitor)).size : null
}
