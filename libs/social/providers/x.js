import { resolveXKeys } from '@/libs/integrations/credentials'
import { hasXKeys, oauth1Header } from '../oauth'

function trimCaption(text, max = 280) {
  const s = String(text || '').trim()
  if (s.length <= max) return s
  return `${s.slice(0, max - 1)}…`
}

/** v2 media upload (v1.1 was retired). JSON body, so only the oauth_* fields are signed. */
async function uploadMedia(buffer, keys) {
  const url = 'https://api.x.com/2/media/upload'
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: oauth1Header('POST', url, {}, keys), 'Content-Type': 'application/json' },
    body: JSON.stringify({ media: buffer.toString('base64'), media_category: 'tweet_image' }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || !json.data?.id) throw new Error(json.detail || json.title || json.errors?.[0]?.message || 'X media upload failed')
  return json.data.id
}

async function createTweet(text, mediaId, keys) {
  const url = 'https://api.x.com/2/tweets'
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: oauth1Header('POST', url, {}, keys),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, media: { media_ids: [mediaId] } }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.detail || json.title || json.errors?.[0]?.message || 'X post failed')
  return json
}

/** X/Twitter: upload JPEG + tweet (OAuth 1.0a user context). */
export async function postX({ caption, imageBuffer }) {
  if (!imageBuffer?.length) throw new Error('Image file missing')
  const keys = await resolveXKeys()
  if (!hasXKeys(keys)) throw new Error('X API keys not configured')

  const mediaId = await uploadMedia(imageBuffer, keys)
  return createTweet(trimCaption(caption), mediaId, keys)
}
