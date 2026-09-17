import { getSiteUrl } from '@/libs/site-url'
import { quoteAlt, quoteOneLine } from '@/libs/quote-text'

export function pinterestApiBase() {
  const sandbox = process.env.PINTEREST_SANDBOX
  return sandbox === '1' || sandbox === 'true'
    ? 'https://api-sandbox.pinterest.com'
    : 'https://api.pinterest.com'
}

export function pinterestKeys() {
  return {
    token: process.env.PINTEREST_ACCESS_TOKEN,
    boardId: process.env.PINTEREST_BOARD_ID,
  }
}

export function hasPinterestKeys(keys = pinterestKeys()) {
  return Boolean(keys.token && keys.boardId)
}

export function clipPinText(text, max) {
  const s = String(text || '').trim()
  if (s.length <= max) return s
  return `${s.slice(0, max - 1).trimEnd()}…`
}

export function pinterestTitle(quote) {
  return clipPinText(quoteOneLine(quote?.text) || `Quote #${quote?.n || ''}`, 100)
}

/** Pinterest pin via API v5. Uploads the JPEG (works on localhost). */
export async function postPinterest({ caption, imageBuffer, quote }) {
  if (!imageBuffer?.length) throw new Error('Image file missing')
  const { token, boardId } = pinterestKeys()
  if (!hasPinterestKeys({ token, boardId })) throw new Error('Pinterest not configured')

  const slug = quote?.slug
  const link = slug ? `${getSiteUrl()}/quotes/${slug}` : getSiteUrl()
  const res = await fetch(`${pinterestApiBase()}/v5/pins`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      board_id: boardId,
      title: pinterestTitle(quote),
      description: clipPinText(caption, 800),
      alt_text: clipPinText(quoteAlt(quote || {}), 500),
      link,
      media_source: {
        source_type: 'image_base64',
        content_type: 'image/jpeg',
        data: imageBuffer.toString('base64'),
      },
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
