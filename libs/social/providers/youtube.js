import { getSiteUrl } from '@/libs/site-url'
import { quoteOneLine } from '@/libs/quote-text'
import { encodeQuoteShort, quoteHook } from '@/libs/social/quote-short'
import { youtubeClient } from '@/libs/social/youtube-oauth'
import { resolveYoutubeRefreshToken } from '@/libs/social/youtube-store'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const UPLOAD_URL = 'https://www.googleapis.com/upload/youtube/v3/videos'
const API = 'https://www.googleapis.com/youtube/v3'
const PLAYLIST_TITLE = process.env.YOUTUBE_PLAYLIST_TITLE || 'BeBetterYou Daily'

const TITLE_PATTERNS = [
  (h) => h,
  (h) => (/[.!?…]$/.test(h) ? `${h.slice(0, -1).trimEnd()}…` : `${h}…`),
  (h) => `Read this twice: ${h}`,
  (h) => `Why this hits: ${h}`,
  (h) => (h.endsWith('?') ? h : `${h.replace(/[.!]$/, '')}?`),
  (h) => `Save this: ${h}`,
]

function titleSeed(quote) {
  const seed = String(quote?.slug || quote?.n || '0')
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h + seed.charCodeAt(i) * (i + 1)) % 997
  return h
}

export async function youtubeKeys() {
  const { clientId, clientSecret } = youtubeClient()
  return {
    clientId,
    clientSecret,
    refreshToken: await resolveYoutubeRefreshToken(),
  }
}

export function hasYoutubeKeys(keys) {
  return Boolean(keys?.clientId && keys?.clientSecret && keys?.refreshToken)
}

/** Hook-based feed title with a seeded pattern wrapper (≤100 chars). */
export function youtubeTitle(quote) {
  const hook = quoteHook(quote?.text) || quoteOneLine(quote?.text) || `Quote #${quote?.n || ''}`
  const pattern = TITLE_PATTERNS[titleSeed(quote) % TITLE_PATTERNS.length]
  const raw = String(pattern(hook) || hook).trim()
  if (raw.length <= 100) return raw
  if (hook.length <= 100) return hook
  return `${hook.slice(0, 99).trimEnd()}…`
}

/** Caption (quote + link + tags) plus #Shorts for search. */
export function youtubeDescription(quote, caption) {
  const body = String(caption || '').trim() || youtubeTitle(quote)
  return /#shorts/i.test(body) ? body : `${body}\n\n#Shorts`
}

function youtubePrivacy() {
  const value = String(process.env.YOUTUBE_PRIVACY || 'public').toLowerCase()
  return ['public', 'unlisted', 'private'].includes(value) ? value : 'public'
}

function youtubeTags(quote, { weekReview = false } = {}) {
  const base = weekReview
    ? ['BeBetterYou', 'motivation', 'Shorts', 'WeekInReview']
    : ['BeBetterYou', 'motivation', 'Shorts']
  return [...base, ...(quote?.tags || [])].slice(0, 15)
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

async function setThumbnail(token, videoId, jpeg) {
  if (!jpeg?.length || !videoId) return { ok: false, error: 'Thumbnail missing' }
  const res = await fetch(
    `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${encodeURICommand(videoId)}&uploadType=media`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'image/jpeg' },
      body: new Uint8Array(jpeg),
    }
  )
  if (!res.ok) return { ok: false, error: await youtubeError(res) }
  return { ok: true }
}

function pinCommentText(quote, caption) {
  const body = quoteOneLine(quote?.text) || String(caption || '').split('\n')[0] || ''
  const url = quote?.slug
    ? `${getSiteUrl()}/quotes/${quote.slug}?utm_source=youtube&utm_medium=social&utm_content=pin`
    : `${getSiteUrl()}?utm_source=youtube&utm_medium=social&utm_content=pin`
  return [body, url].filter(Boolean).join('\n\n')
}

/** Soft-fail pinned top-level comment (needs youtube.force-ssl). */
async function pinComment(token, videoId, text) {
  const body = String(text || '').trim()
  if (!body || !videoId) return { ok: false, error: 'Comment missing' }
  const res = await fetch(`${API}/commentThreads?part=snippet`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      snippet: {
        videoId,
        topLevelComment: { snippet: { textOriginal: body.slice(0, 9000) } },
      },
    }),
  })
  if (!res.ok) return { ok: false, error: await youtubeError(res) }
  return { ok: true }
}

async function findOrCreatePlaylist(token, title) {
  const envId = String(process.env.YOUTUBE_PLAYLIST_ID || '').trim()
  if (envId) return envId

  let pageToken = ''
  for (let i = 0; i < 5; i++) {
    const url = new URL(`${API}/playlists`)
    url.searchParams.set('part', 'snippet')
    url.searchParams.set('mine', 'true')
    url.searchParams.set('maxResults', '50')
    if (pageToken) url.searchParams.set('pageToken', pageToken)
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) throw new Error(await youtubeError(res))
    const data = await res.json()
    const hit = (data.items || []).find((item) => item?.snippet?.title === title)
    if (hit?.id) return hit.id
    pageToken = data.nextPageToken || ''
    if (!pageToken) break
  }

  const created = await fetch(`${API}/playlists?part=snippet,status`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      snippet: { title, description: 'Daily BeBetterYou Shorts' },
      status: { privacyStatus: 'public' },
    }),
  })
  const data = await created.json().catch(() => ({}))
  if (!created.ok || !data.id) throw new Error(data.error?.message || 'Could not create playlist')
  return data.id
}

/** Soft-fail add to BeBetterYou Daily playlist. */
async function addToPlaylist(token, videoId) {
  if (!videoId) return { ok: false, error: 'Video missing' }
  try {
    const playlistId = await findOrCreatePlaylist(token, PLAYLIST_TITLE)
    const res = await fetch(`${API}/playlistItems?part=snippet`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        snippet: {
          playlistId,
          resourceId: { kind: 'youtube#video', videoId },
        },
      }),
    })
    if (!res.ok) return { ok: false, error: await youtubeError(res) }
    return { ok: true, playlistId }
  } catch (err) {
    return { ok: false, error: err.message || 'Playlist failed' }
  }
}

/** Upload a quote as a YouTube Short (official videos.insert). Pass `video`+`poster` to skip encode. */
export async function postYouTube({ caption, imageBuffer, quote, video, poster, title, weekReview = false }) {
  const keys = await youtubeKeys()
  if (!hasYoutubeKeys(keys)) throw new Error('YouTube not configured')

  const encoded =
    video && poster
      ? { video, poster }
      : await encodeQuoteShort(imageBuffer, quote)
  const token = await accessToken(keys)
  const metadata = {
    snippet: {
      title: title || youtubeTitle(quote),
      description: youtubeDescription(quote, caption),
      categoryId: '22',
      tags: youtubeTags(quote, { weekReview }),
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
      'X-Upload-Content-Length': String(encoded.video.length),
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
      'Content-Length': String(encoded.video.length),
    },
    body: new Uint8Array(encoded.video),
  })
  const posted = await put.json().catch(() => ({}))
  if (!put.ok || !posted.id) {
    throw new Error(posted.error?.message || `YouTube upload failed (${put.status})`)
  }
  const thumb = await setThumbnail(token, posted.id, encoded.poster)
  const comment = weekReview
    ? { ok: true }
    : await pinComment(token, posted.id, pinCommentText(quote, caption))
  const playlist = weekReview ? { ok: true } : await addToPlaylist(token, posted.id)

  const watch = `https://www.youtube.com/watch?v=${posted.id}`
  const meta = await fetch(
    `${API}/videos?part=snippet,status&id=${encodeURIComponent(posted.id)}`,
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
    thumbnail: thumb.ok,
    ...(thumb.ok ? {} : { thumbnailError: thumb.error }),
    ...(comment.ok ? {} : { commentError: comment.error }),
    ...(playlist.ok ? {} : { playlistError: playlist.error }),
  }
}
