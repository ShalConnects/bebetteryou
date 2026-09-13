import { quoteCard } from '@/config/quote-card'
import { getSiteUrl } from '@/libs/site-url'
import { quoteAlt, quoteOneLine } from '@/libs/quote-text'

const DEFAULT_PDS = 'https://bsky.social'
const TEXT_MAX = 300
const ALT_MAX = 1000
const BLOB_MAX = 1_000_000

export function blueskyKeys() {
  return {
    handle: process.env.BLUESKY_HANDLE,
    password: process.env.BLUESKY_APP_PASSWORD,
    pds: (process.env.BLUESKY_PDS || DEFAULT_PDS).replace(/\/$/, ''),
  }
}

export function hasBlueskyKeys(keys = blueskyKeys()) {
  return Boolean(keys.handle && keys.password)
}

export function clipBlueskyText(text, max = TEXT_MAX) {
  const s = String(text || '').trim()
  const segs = [...new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(s)]
  if (segs.length <= max) return s
  return `${segs
    .slice(0, max - 1)
    .map((x) => x.segment)
    .join('')
    .trimEnd()}…`
}

/** Short caption: quote + link. Bluesky caps posts at 300 graphemes. */
export function blueskyCaption(quote, siteUrl = getSiteUrl()) {
  const url = quote?.slug ? `${siteUrl}/quotes/${quote.slug}` : ''
  const body = quoteOneLine(quote?.text) || `Quote #${quote?.n || ''}`
  const credit = quote?.author?.trim()
  const head = credit ? `${body} — ${credit}` : body
  const reserved = url ? url.length + 2 : 0
  const text = clipBlueskyText(head, Math.max(1, TEXT_MAX - reserved))
  return url ? `${text}\n\n${url}` : text
}

export function linkFacets(text) {
  const facets = []
  const re = /https?:\/\/[^\s]+/g
  let m
  while ((m = re.exec(text))) {
    facets.push({
      index: {
        byteStart: Buffer.from(text.slice(0, m.index), 'utf8').length,
        byteEnd: Buffer.from(text.slice(0, m.index + m[0].length), 'utf8').length,
      },
      features: [{ $type: 'app.bsky.richtext.facet#link', uri: m[0] }],
    })
  }
  return facets
}

function postUrl(handle, uri) {
  const rkey = String(uri || '').split('/').pop()
  const h = String(handle || '').replace(/^@/, '')
  return rkey && h ? `https://bsky.app/profile/${h}/post/${rkey}` : null
}

async function createSession({ handle, password, pds }) {
  const res = await fetch(`${pds}/xrpc/com.atproto.server.createSession`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: handle, password }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.accessJwt || !data.did) {
    throw new Error(data.message || data.error || 'Bluesky sign-in failed')
  }
  return data
}

/** Bluesky: upload JPEG blob, then create a feed post. Works on localhost. */
export async function postBluesky({ imageBuffer, quote }) {
  if (!imageBuffer?.length) throw new Error('Image file missing')
  if (imageBuffer.length > BLOB_MAX) throw new Error('Bluesky images must be under 1 MB')
  const keys = blueskyKeys()
  if (!hasBlueskyKeys(keys)) throw new Error('Bluesky not configured')

  const { accessJwt, did } = await createSession(keys)
  const auth = { Authorization: `Bearer ${accessJwt}` }

  const blobRes = await fetch(`${keys.pds}/xrpc/com.atproto.repo.uploadBlob`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'image/jpeg' },
    body: imageBuffer,
  })
  const blobData = await blobRes.json().catch(() => ({}))
  if (!blobRes.ok || !blobData.blob) {
    throw new Error(blobData.message || blobData.error || 'Bluesky image upload failed')
  }

  const text = blueskyCaption(quote)
  const facets = linkFacets(text)
  const record = {
    $type: 'app.bsky.feed.post',
    text,
    createdAt: new Date().toISOString(),
    embed: {
      $type: 'app.bsky.embed.images',
      images: [
        {
          alt: clipBlueskyText(quoteAlt(quote || {}), ALT_MAX),
          image: blobData.blob,
          aspectRatio: { width: quoteCard.width, height: quoteCard.height },
        },
      ],
    },
  }
  if (facets.length) record.facets = facets

  const postRes = await fetch(`${keys.pds}/xrpc/com.atproto.repo.createRecord`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      repo: did,
      collection: 'app.bsky.feed.post',
      record,
    }),
  })
  const posted = await postRes.json().catch(() => ({}))
  if (!postRes.ok || !posted.uri) {
    throw new Error(posted.message || posted.error || 'Bluesky post failed')
  }

  return { id: posted.uri, url: postUrl(keys.handle, posted.uri) }
}
