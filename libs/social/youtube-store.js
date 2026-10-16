import fs from 'fs'
import path from 'path'
import { mongoUri } from '@/libs/mongo-uri'
import { youtubeClient } from '@/libs/social/youtube-oauth'

const dataFile = path.join(process.cwd(), 'data/youtube-auth.json')
const network = 'youtube'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const PROBE_TTL_MS = 5 * 60 * 1000
let lastProbe = { key: '', ok: false, at: 0 }

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

/** Prefer Connect/Mongo (or local file) over a stale Vercel env override. */
export async function resolveYoutubeRefreshToken() {
  const stored = await readYoutubeRefreshToken()
  if (stored) return stored
  return String(process.env.YOUTUBE_REFRESH_TOKEN || '').trim()
}

/** Lightweight refresh probe (cached ~5m). False on missing/revoked tokens. */
export async function probeYoutubeRefreshToken(refreshToken) {
  const token = String(refreshToken || '').trim()
  if (!token) return false
  const { clientId, clientSecret } = youtubeClient()
  if (!clientId || !clientSecret) return false
  if (lastProbe.key === token && Date.now() - lastProbe.at < PROBE_TTL_MS) return lastProbe.ok

  let ok = false
  try {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: token,
        grant_type: 'refresh_token',
      }),
    })
    const data = await res.json().catch(() => ({}))
    ok = Boolean(res.ok && data.access_token)
  } catch {
    ok = false
  }
  lastProbe = { key: token, ok, at: Date.now() }
  return ok
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
