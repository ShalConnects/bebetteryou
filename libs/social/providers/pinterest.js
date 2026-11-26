import { getSiteUrl } from '@/libs/site-url'
import { quoteAlt, quoteOneLine } from '@/libs/quote-text'
import { resolvePinterestKeys } from '@/libs/integrations/credentials'

export function pinterestApiBase() {
  const sandbox = process.env.PINTEREST_SANDBOX
  return sandbox === '1' || sandbox === 'true'
    ? 'https://api-sandbox.pinterest.com'
    : 'https://api.pinterest.com'
}

/** Sync env-only (tests). Prefer resolvePinterestKeys() at runtime. */
export function pinterestKeys() {
  return {
    token: process.env.PINTEREST_ACCESS_TOKEN,
    boardId: process.env.PINTEREST_BOARD_ID,
  }
}

export function hasPinterestKeys(keys) {
  const k = keys || pinterestKeys()
  return Boolean(k.token && k.boardId)
}

export function clipPinText(text, max) {
  const s = String(text || '').trim()
  if (s.length <= max) return s
  return `${s.slice(0, max - 1).trimEnd()}…`
}

export function pinterestTitle(quote) {
  return clipPinText(quoteOneLine(quote?.text) || `Quote #${quote?.n || ''}`, 100)
}

/** Register, upload and wait for a video; returns its media_id. */
async function uploadPinVideo(token, video) {
  const api = (path, init = {}) =>
    fetch(`${pinterestApiBase()}/v5/media${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    }).then((r) => r.json())
  const { media_id, upload_url, upload_parameters, message } = await api('', { method: 'POST', body: JSON.stringify({ media_type: 'video' }) })
  if (!media_id) throw new Error(message || 'Pinterest video register failed')
  const form = new FormData()
  for (const [k, v] of Object.entries(upload_parameters || {})) form.append(k, v)
  form.append('file', new Blob([video], { type: 'video/mp4' }), 'video.mp4')
  const up = await fetch(upload_url, { method: 'POST', body: form })
  if (!up.ok) throw new Error(`Pinterest video upload failed (${up.status})`)
  for (let i = 0; i < 40; i++) {
    const { status } = await api(`/${media_id}`)
    if (status === 'succeeded') return media_id
    if (status === 'failed') throw new Error('Pinterest video processing failed')
    await new Promise((r) => setTimeout(r, 3000))
  }
  throw new Error('Pinterest video timed out')
}

/** Pinterest pin via API v5: a JPEG (imageBuffer) or an MP4 (video + public coverUrl). */
export async function postPinterest({ caption, imageBuffer, video, coverUrl, quote, title, link: linkOverride, altText }) {
  if (!imageBuffer?.length && !video?.length) throw new Error('Image file missing')
  const { token, boardId } = await resolvePinterestKeys()
  if (!boardId) throw new Error('Pinterest board id missing — save it under Integrations')
  if (!token) {
    throw new Error('Pinterest token expired or missing — Connect Pinterest under Integrations')
  }
  if (!hasPinterestKeys({ token, boardId })) throw new Error('Pinterest not configured')

  const slug = quote?.slug
  const link = linkOverride || (slug ? `${getSiteUrl()}/quotes/${slug}` : getSiteUrl())
  const res = await fetch(`${pinterestApiBase()}/v5/pins`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      board_id: boardId,
      title: clipPinText(title || pinterestTitle(quote), 100),
      description: clipPinText(caption, 800),
      alt_text: clipPinText(altText || quoteAlt(quote || {}), 500),
      link,
      media_source: video
        ? { source_type: 'video_id', media_id: await uploadPinVideo(token, video), cover_image_url: coverUrl }
        : { source_type: 'image_base64', content_type: 'image/jpeg', data: imageBuffer.toString('base64') },
    }),
  })
  const posted = await res.json().catch(() => ({}))
  if (!res.ok || !posted.id) {
    throw new Error(posted.message || posted.error || 'Pinterest pin failed')
  }
  return {
    id: posted.id,
    url: posted.link || `https://www.pinterest.com/pin/${posted.id}/`,
  }
}
