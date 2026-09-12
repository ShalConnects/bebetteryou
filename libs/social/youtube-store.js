import fs from 'fs'
import path from 'path'
import { mongoUri } from '@/libs/mongo-uri'

const dataFile = path.join(process.cwd(), 'data/youtube-auth.json')
const network = 'youtube'

function readLocal() {
  try {
    const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'))
    return data?.refreshToken || ''
  } catch {
    return ''
  }
}

function writeLocal(refreshToken) {
  fs.mkdirSync(path.dirname(dataFile), { recursive: true })
  fs.writeFileSync(dataFile, JSON.stringify({ refreshToken, updatedAt: new Date().toISOString() }, null, 2))
}

async function readRemote() {
  if (!mongoUri()) return ''
  try {
    const { connectDB } = await import('@/libs/mongo')
    const SocialAuth = (await import('@/models/SocialAuth')).default
    await connectDB()
    const doc = await SocialAuth.findOne({ network }).select('refreshToken').lean()
    return doc?.refreshToken || ''
  } catch {
    return ''
  }
}

export async function readYoutubeRefreshToken() {
  return (await readRemote()) || readLocal() || ''
}

export async function saveYoutubeRefreshToken(refreshToken) {
  const token = String(refreshToken || '').trim()
  if (!token) throw new Error('YouTube refresh token missing')
  if (process.env.VERCEL && !mongoUri()) {
    throw new Error('MONGODB_URI required to save YouTube login on Vercel')
  }
  if (!process.env.VERCEL) writeLocal(token)
  if (!mongoUri()) return
  const { connectDB } = await import('@/libs/mongo')
  const SocialAuth = (await import('@/models/SocialAuth')).default
  await connectDB()
  await SocialAuth.findOneAndUpdate(
    { network },
    { $set: { refreshToken: token } },
    { upsert: true, setDefaultsOnInsert: true }
  )
}
