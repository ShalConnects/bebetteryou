import { quoteOneLine } from '@/libs/quote-text'
import { encodeQuoteShort } from '@/libs/social/quote-short'
import { youtubeClient } from '@/libs/social/youtube-oauth'
import { readYoutubeRefreshToken } from '@/libs/social/youtube-store'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const UPLOAD_URL = 'https://www.googleapis.com/upload/youtube/v3/videos'

export async function youtubeKeys() {
  const { clientId, clientSecret } = youtubeClient()
  return {
    clientId,
    clientSecret,
    refreshToken: process.env.YOUTUBE_REFRESH_TOKEN || (await readYoutubeRefreshToken()),
  }
}

export function hasYoutubeKeys(keys) {
  return Boolean(keys?.clientId && keys?.clientSecret && keys?.refreshToken)
}

/** YouTube titles cap at 100 chars. #Shorts helps the 9:16 clip land in Shorts. */
export function youtubeTitle(quote) {
  const suffix = ' #Shorts'
  const raw = quoteOneLine(quote?.text) || `Quote #${quote?.n || ''}`
  const max = 100
  if (raw.length + suffix.length <= max) return `${raw}${suffix}`
  return `${raw.slice(0, max - suffix.length - 1).trimEnd()}…${suffix}`
}

function youtubePrivacy() {
  const value = String(process.env.YOUTUBE_PRIVACY || 'public').toLowerCase()
  return ['public', 'unlisted', 'private'].includes(value) ? value : 'public'
}

async function accessToken(keys) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: keys.clientId,
      client_secret: keys.clientSecret,
      refresh_token: keys.refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'YouTube token refresh failed')
  }
  return data.access_token
}

async function youtubeError(res) {
  const data = await res.json().catch(() => ({}))
  return data.error?.message || data.error?.errors?.[0]?.message || `YouTube upload failed (${res.status})`
}

/** Upload a quote card as a YouTube Short (official videos.insert). */
export async function postYouTube({ caption, imageBuffer, quote }) {
  if (!imageBuffer?.length) throw new Error('Image file missing')
  const keys = await youtubeKeys()
  if (!hasYoutubeKeys(keys)) throw new Error('YouTube not configured')

  const video = await encodeQuoteShort(imageBuffer)
  const token = await accessToken(keys)
  const metadata = {
    snippet: {
      title: youtubeTitle(quote),
      description: caption || youtubeTitle(quote),
      categoryId: '22',
      tags: ['BeBetterYou', 'motivation', 'Shorts', ...(quote?.tags || [])].slice(0, 15),
    },
    status: {
      privacyStatus: youtubePrivacy(),
      selfDeclaredMadeForKids: false,
    },
  }

  const start = await fetch(`${UPLOAD_URL}?uploadType=resumable&part=snippet,status`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Length': String(video.length),
      'X-Upload-Content-Type': 'video/mp4',
    },
    body: JSON.stringify(metadata),
  })
  const location = start.headers.get('location')
  if (!start.ok || !location) throw new Error(await youtubeError(start))

  const put = await fetch(location, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'video/mp4',
      'Content-Length': String(video.length),
    },
    body: new Uint8Array(video),
  })
  const posted = await put.json().catch(() => ({}))
  if (!put.ok || !posted.id) {
    throw new Error(posted.error?.message || `YouTube upload failed (${put.status})`)
  }

  const watch = `https://www.youtube.com/watch?v=${posted.id}`
  const meta = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet,status&id=${encodeURIComponent(posted.id)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
    .then((res) => res.json())
    .catch(() => ({}))
  const item = meta.items?.[0]
  return {
    id: posted.id,
    url: watch,
    privacy: item?.status?.privacyStatus || youtubePrivacy(),
    channel: item?.snippet?.channelTitle || '',
  }
}
