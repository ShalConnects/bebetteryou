import fs from 'fs'
import path from 'path'
import { mongoUri } from '@/libs/mongo-uri'

const dataFile = path.join(process.cwd(), 'data/trend-posts.json')
const fields = ['date', 'source', 'topic', 'hashtag', 'text', 'tags', 'theme', 'src', 'status', 'results', 'error']
const blank = { status: 'draft', tags: [], results: [] }
const pick = (row) => Object.fromEntries(fields.map((k) => [k, row[k] ?? blank[k] ?? '']))

function readLocal() {
  try {
    return JSON.parse(fs.readFileSync(dataFile, 'utf8'))
  } catch {
    return {}
  }
}

async function model() {
  const { connectDB } = await import('@/libs/mongo')
  const TrendPost = (await import('@/models/TrendPost')).default
  await connectDB()
  return TrendPost
}

/** Trend rows newest first. Live: Mongo. This Mac without MONGODB_URI: data/trend-posts.json. */
export async function readTrends(query = {}) {
  const rows = mongoUri()
    ? await (await model()).find(query).lean()
    : process.env.VERCEL
      ? []
      : Object.values(readLocal()).filter((r) => Object.entries(query).every(([k, v]) => r[k] === v))
  return rows.map(pick).sort((a, b) => b.date.localeCompare(a.date))
}

export async function saveTrend(date, patch) {
  if (mongoUri()) {
    return pick(await (await model()).findOneAndUpdate({ date }, { $set: patch }, { upsert: true, new: true }).lean())
  }
  const all = readLocal()
  all[date] = pick({ ...all[date], ...patch, date })
  fs.writeFileSync(dataFile, JSON.stringify(all, null, 2))
  return all[date]
}
