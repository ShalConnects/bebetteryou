import fs from 'fs'
import path from 'path'
import { getSiteUrl } from '@/libs/site-url'
import { networkStatus } from '@/config/social'
import { youtubeClient } from '@/libs/social/youtube-oauth'
import { readYoutubeRefreshToken } from '@/libs/social/youtube-store'
import { readQuotes } from '@/libs/quotes-store'
import { quoteOneLine } from '@/libs/quote-text'
import { hashtagsForTags } from '@/libs/tag-lane'
import { readTags } from '@/libs/tags-store'
import { postInstagram } from './providers/instagram'
import { postFacebook } from './providers/facebook'
import { postLinkedIn } from './providers/linkedin'
import { postX } from './providers/x'
import { postYouTube } from './providers/youtube'
import { postPinterest } from './providers/pinterest'
import { postThreads } from './providers/threads'
import { postBluesky } from './providers/bluesky'
import { postTelegram } from './providers/telegram'
import { encodeQuoteShort } from '@/libs/social/quote-short'
import { recordPost } from './post-store'

const providers = {
  instagram: postInstagram,
  facebook: postFacebook,
  linkedin: postLinkedIn,
  x: postX,
  youtube: postYouTube,
  pinterest: postPinterest,
  threads: postThreads,
  bluesky: postBluesky,
  telegram: postTelegram,
}

/** Env keys plus a YouTube refresh token saved from Connect on the dashboard. */
export async function readyNetworks() {
  const { clientId, clientSecret } = youtubeClient()
  const youtubeReady = Boolean(
    clientId && clientSecret && (process.env.YOUTUBE_REFRESH_TOKEN || (await readYoutubeRefreshToken()))
  )
  return networkStatus().map((n) => {
    if (n.id !== 'youtube') return n
    return {
      ...n,
      ready: youtubeReady,
      pending: false,
      connectable: Boolean(clientId && clientSecret) && !youtubeReady,
    }
  })
}

export async function quoteCaption(quote, networkId) {
  const body = quoteOneLine(quote.text) || `Quote #${quote.n}`
  const credit = quote.author?.trim()
  const head = credit ? `${body}\n\n— ${credit}` : body
  const tags = hashtagsForTags(quote.tags, await readTags())
  const network = networkId || null

  /** No network → keep legacy caption (quote + site URL + tags). */
  if (!network) {
    const url = quotePageUrl(quote)
    const core = `${head}\n\n${url}`
    return tags ? `${core}\n\n${tags}` : core
  }

  /** Meta + X: no outbound URL — protect reach; soft CTA instead. */
  if (network === 'instagram' || network === 'threads' || network === 'facebook') {
    const core = `${head}\n\n${softCta(quote)}`
    return tags ? `${core}\n\n${tags}` : core
  }

  if (network === 'x') {
    const core = credit ? `${body} — ${credit}` : body
    return tags ? `${core}\n\n${tags}` : core
  }

  if (network === 'linkedin') {
    const core = `${head}\n\n${softCta(quote)}`
    return tags ? `${core}\n\n${tags}` : core
  }

  /** Pinterest / Telegram / YouTube / Bluesky: keep site URL (+ UTM where useful). */
  if (network === 'pinterest' || network === 'telegram' || network === 'youtube') {
    const core = `${head}\n\n${quotePageUrl(quote, network)}`
    return tags ? `${core}\n\n${tags}` : core
  }

  if (network === 'bluesky') {
    return `${head}\n\n${quotePageUrl(quote, 'bluesky')}`
  }

  const url = quotePageUrl(quote, network)
  const core = `${head}\n\n${url}`
  return tags ? `${core}\n\n${tags}` : core
}

const SOFT_CTAS = [
  'Save this for a hard day.',
  'Which line hits you today?',
  'Follow for a daily push.',
  'Share with someone who needs this.',
]

function softCta(quote) {
  const seed = String(quote?.slug || quote?.n || '0')
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h + seed.charCodeAt(i) * (i + 1)) % 997
  return SOFT_CTAS[h % SOFT_CTAS.length]
}

function quotePageUrl(quote, networkId) {
  const base = getSiteUrl()
  const path = quote?.slug ? `${base}/quotes/${quote.slug}` : base
  if (networkId === 'telegram' || networkId === 'youtube' || networkId === 'pinterest' || networkId === 'bluesky') {
    return `${path}?utm_source=${networkId}&utm_medium=social`
  }
  return path
}

function absoluteImageUrl(src) {
  return src.startsWith('http') ? src : `${getSiteUrl()}${src.startsWith('/') ? '' : '/'}${src}`
}

function localImagePath(src) {
  return path.join(process.cwd(), 'public', src.replace(/^\//, ''))
}

/** Post a saved quote to selected networks. Returns [{ id, ok, error? }]. */
export async function postQuote(slug, networkIds) {
  const quote = (await readQuotes()).find((q) => q.slug === slug)
  if (!quote) throw new Error('Quote not found')

  const statusList = await readyNetworks()
  const status = Object.fromEntries(statusList.map((n) => [n.id, n]))
  const imageUrl = absoluteImageUrl(quote.src)
  const imageBuffer = await resolveQuoteImageBuffer(quote.src)

  const targets = networkIds?.length
    ? networkIds
    : statusList.filter((n) => n.ready).map((n) => n.id)

  return Promise.all(
    targets.map(async (id) => {
      const meta = status[id]
      if (!meta) return { id, ok: false, error: 'Unknown network' }
      if (!meta.ready) return { id, label: meta.label, ok: false, error: 'Not configured' }
      const post = providers[id]
      if (!post) return { id, label: meta.label, ok: false, error: 'Not implemented' }
      try {
        const caption = await quoteCaption(quote, id)
        const posted = await post({ caption, imageUrl, imageBuffer, quote })
        const result = {
          id,
          label: meta.label,
          ok: true,
          url: posted?.url || null,
          privacy: posted?.privacy || null,
          channel: posted?.channel || null,
          ...(posted?.thumbnail === false
            ? { thumbnailError: posted.thumbnailError || 'Thumbnail not set' }
            : {}),
        }
        await recordPost(slug, result)
        return result
      } catch (err) {
        const result = { id, label: meta.label, ok: false, error: err.message || 'Failed' }
        await recordPost(slug, result)
        return result
      }
    })
  )
}

/** Encode a Short for dashboard preview (does not upload). */
export async function previewQuoteShort(slug) {
  const quote = (await readQuotes()).find((q) => q.slug === slug)
  if (!quote) throw new Error('Quote not found')
  const imageBuffer = await resolveQuoteImageBuffer(quote.src)
  return encodeQuoteShort(imageBuffer, quote)
}

/** Load a quote card JPEG from local public/ or fetch from its public URL. */
export async function resolveQuoteImageBuffer(src) {
  const local = localImagePath(src)
  if (!src.startsWith('http') && fs.existsSync(local)) return fs.readFileSync(local)
  const url = absoluteImageUrl(src)
  const res = await fetch(url)
  if (!res.ok) throw new Error('Could not fetch quote image for upload')
  return Buffer.from(await res.arrayBuffer())
}
