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

const providers = {
  instagram: postInstagram,
  facebook: postFacebook,
  linkedin: postLinkedIn,
  x: postX,
  youtube: postYouTube,
}

/** Env keys plus a YouTube refresh token saved from Connect on the dashboard. */
export async function readyNetworks() {
  const { clientId, clientSecret } = youtubeClient()
  const youtubeReady = Boolean(
    clientId && clientSecret && (process.env.YOUTUBE_REFRESH_TOKEN || (await readYoutubeRefreshToken()))
  )
  return networkStatus().map((n) => {
    if (n.id !== 'youtube') return { ...n, connectable: false }
    return {
      ...n,
      ready: youtubeReady,
      connectable: Boolean(clientId && clientSecret) && !youtubeReady,
    }
  })
}

export async function quoteCaption(quote) {
  const body = quoteOneLine(quote.text) || `Quote #${quote.n}`
  const base = getSiteUrl()
  const credit = quote.author?.trim()
  const core = credit
    ? `${body}\n\n— ${credit}\n${base}/quotes/${quote.slug}`
    : `${body}\n\n${base}/quotes/${quote.slug}`
  const tags = hashtagsForTags(quote.tags, await readTags())
  return tags ? `${core}\n\n${tags}` : core
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
  const caption = await quoteCaption(quote)
  const imageUrl = absoluteImageUrl(quote.src)
  const imageBuffer = await resolveImageBuffer(quote.src)

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
        await post({ caption, imageUrl, imageBuffer, quote })
        return { id, label: meta.label, ok: true }
      } catch (err) {
        return { id, label: meta.label, ok: false, error: err.message || 'Failed' }
      }
    })
  )
}

async function resolveImageBuffer(src) {
  const local = localImagePath(src)
  if (!src.startsWith('http') && fs.existsSync(local)) return fs.readFileSync(local)
  const url = absoluteImageUrl(src)
  const res = await fetch(url)
  if (!res.ok) throw new Error('Could not fetch quote image for upload')
  return Buffer.from(await res.arrayBuffer())
}
