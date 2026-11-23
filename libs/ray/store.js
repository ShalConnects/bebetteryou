import fs from 'fs'
import path from 'path'
import { mongoUri } from '@/libs/mongo-uri'
import seeds from '@/data/ray-scripts.json'

const dataFile = path.join(process.cwd(), 'data/ray-videos.json')
const fields = ['slug', 'postAt', 'hook', 'script', 'status', 'requestId', 'costUsd', 'submittedAt', 'videoUrl', 'results', 'error']

function readLocal() {
  try {
    return JSON.parse(fs.readFileSync(dataFile, 'utf8'))
  } catch {
    return {}
  }
}

async function model() {
  const { connectDB } = await import('@/libs/mongo')
  const RayVideo = (await import('@/models/RayVideo')).default
  await connectDB()
  return RayVideo
}

const blank = { status: 'draft', costUsd: 0, results: [] }
const pick = (row) => Object.fromEntries(fields.map((k) => [k, row[k] ?? blank[k] ?? '']))

/** Starter scripts written ahead, used until a row is saved. */
export const seedScripts = () => seeds

/** `{ [slug]: row }`. Live: Mongo. This Mac without MONGODB_URI: data/ray-videos.json. */
export async function readRays(query = {}) {
  if (mongoUri()) {
    const rows = await (await model()).find(query).lean()
    return Object.fromEntries(rows.map((r) => [r.slug, pick(r)]))
  }
  if (process.env.VERCEL) return {}
  const all = readLocal()
  return Object.fromEntries(Object.entries(all).filter(([, r]) => Object.entries(query).every(([k, v]) => r[k] === v)))
}

export async function saveRay(slug, patch) {
  if (mongoUri()) {
    const row = await (await model()).findOneAndUpdate({ slug }, { $set: patch }, { upsert: true, new: true }).lean()
    return pick(row)
  }
  const all = readLocal()
  all[slug] = pick({ ...all[slug], ...patch, slug })
  fs.writeFileSync(dataFile, JSON.stringify(all, null, 2))
  return all[slug]
}
