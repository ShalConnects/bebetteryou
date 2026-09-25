import { getSiteUrl } from '@/libs/site-url'
import { saveAsset } from '@/libs/asset-store'
import { readQuotes } from '@/libs/quotes-store'
import { notifyQuoteDigest } from '@/libs/newsletter'
import { logError, logInfo } from '@/libs/logger'
import { readyNetworks, quoteCaption, resolveQuoteImageBuffer } from '@/libs/social'
import { postInstagram } from '@/libs/social/providers/instagram'
import { postFacebook } from '@/libs/social/providers/facebook'
import { postBluesky, clipBlueskyText } from '@/libs/social/providers/bluesky'
import { postTelegram } from '@/libs/social/providers/telegram'
import { postPinterest } from '@/libs/social/providers/pinterest'
import { postThreadsThread } from '@/libs/social/providers/threads'
import { postYouTube } from '@/libs/social/providers/youtube'
import { encodeWeekShort } from '@/libs/social/quote-short'
import { recordPost } from '@/libs/social/post-store'
import { renderWeekCollage } from '@/libs/week-collage.mjs'
import {
  WEEK_COLLAGE_NETWORKS,
  fridayWeekRange,
  pickWeekReviewQuotes,
  publicRange,
  weekCaption,
} from '@/libs/week-review'

function absoluteImageUrl(src) {
  return src.startsWith('http') ? src : `${getSiteUrl()}${src.startsWith('/') ? '' : '/'}${src}`
}

const WEEK_TARGETS = [...WEEK_COLLAGE_NETWORKS, 'youtube', 'threads']

/** Shared pick + collage build. No network posts. */
async function prepareWeekReview(now = new Date()) {
  const range = fridayWeekRange(now)
  logInfo('Week review: picking quotes', {
    weekKey: range.weekKey,
    start: range.start.toISOString(),
    end: range.end.toISOString(),
  })

  const catalog = await readQuotes()
  const { quotes, mode } = await pickWeekReviewQuotes(catalog, range)
  logInfo('Week review: pick result', {
    mode,
    catalog: catalog.length,
    picked: quotes.length,
    slugs: quotes.map((q) => q.slug),
  })

  if (!quotes.length) {
    return {
      skipped: true,
      reason: 'No successfully posted quotes for this week',
      range: publicRange(range),
      quotes: [],
      mode,
    }
  }

  logInfo('Week review: loading card images')
  const buffers = await Promise.all(
    quotes.map(async (q) => {
      try {
        const buf = await resolveQuoteImageBuffer(q.src)
        logInfo('Week review: image ok', { slug: q.slug, bytes: buf.length })
        return buf
      } catch (err) {
        logError('Week review: image failed', err, { slug: q.slug, src: q.src })
        throw err
      }
    })
  )

  logInfo('Week review: rendering collage', { cards: buffers.length })
  const collage = await renderWeekCollage(buffers)
  logInfo('Week review: collage ready', {
    bytes: collage.buffer.length,
    width: collage.width,
    height: collage.height,
  })

  return {
    skipped: false,
    mode,
    range,
    quotes,
    buffers,
    collage,
    caption: weekCaption(quotes, range),
  }
}

/**
 * Local dry-run: save collage + encode Short. Does not post or email.
 * Pass `encodeShort: false` for a fast collage-only preview.
 */
export async function previewWeekReview(now = new Date(), { encodeShort = true } = {}) {
  logInfo('Week review preview: start', { encodeShort })
  const prep = await prepareWeekReview(now)
  if (prep.skipped) {
    logInfo('Week review preview: skipped', { reason: prep.reason, mode: prep.mode })
    return prep
  }

  const collageSrc = await saveAsset({
    dir: 'week-reviews',
    filename: `${prep.range.weekKey}-preview.jpg`,
    buffer: prep.collage.buffer,
    contentType: 'image/jpeg',
  })
  logInfo('Week review preview: collage saved', { collageSrc })

  const statusList = await readyNetworks()
  const plan = statusList
    .filter((n) => WEEK_TARGETS.includes(n.id))
    .map((n) => ({
      id: n.id,
      label: n.label,
      ready: n.ready,
      via:
        n.id === 'youtube'
          ? 'short'
          : n.id === 'threads'
            ? 'thread'
            : 'collage',
    }))
  logInfo('Week review preview: network plan', {
    plan: plan.map((p) => `${p.id}:${p.ready ? 'ready' : 'skip'}`),
  })

  const out = {
    skipped: false,
    dryRun: true,
    mode: prep.mode,
    range: publicRange(prep.range),
    quotes: prep.quotes.map((q) => ({ slug: q.slug, n: q.n, text: q.text })),
    caption: prep.caption,
    collage: collageSrc,
    plan,
  }

  if (!encodeShort) {
    logInfo('Week review preview: collage-only done')
    return out
  }

  logInfo('Week review preview: encoding Short', { cards: prep.quotes.length })
  const { video } = await encodeWeekShort(
    prep.quotes.map((quote, i) => ({ quote, imageBuffer: prep.buffers[i] }))
  )
  logInfo('Week review preview: Short ready', { bytes: video.length })
  return { ...out, video }
}

/**
 * Manual Friday publish: collage → IG/FB/Bluesky/Telegram/Pinterest, Short → YT,
 * Threads reply chain, digest email. Skips when the Sat–Thu window is empty.
 */
export async function publishWeekReview(now = new Date()) {
  logInfo('Week review publish: start')
  const prep = await prepareWeekReview(now)
  if (prep.skipped) {
    logInfo('Week review publish: skipped', { reason: prep.reason })
    return { skipped: true, reason: prep.reason, range: prep.range, quotes: 0 }
  }

  const { range, quotes, buffers, collage, caption } = prep
  const slug = `week-${range.weekKey}`
  const collageSrc = await saveAsset({
    dir: 'week-reviews',
    filename: `${range.weekKey}.jpg`,
    buffer: collage.buffer,
    contentType: 'image/jpeg',
  })
  const collageUrl = absoluteImageUrl(collageSrc)
  const site = `${getSiteUrl()}/quotes`
  const blueskyHead = `Week in review · ${quotes.map((q) => `#${q.n}`).join(' ')}`
  const blueskyText = `${clipBlueskyText(blueskyHead, Math.max(1, 300 - site.length - 2))}\n\n${site}`
  const statusList = await readyNetworks()
  const status = Object.fromEntries(statusList.map((n) => [n.id, n]))

  const collageProviders = {
    instagram: () => postInstagram({ imageUrl: collageUrl, caption }),
    facebook: () => postFacebook({ imageUrl: collageUrl, caption }),
    bluesky: () =>
      postBluesky({
        imageBuffer: collage.buffer,
        quote: quotes[0],
        caption: blueskyText,
        aspectRatio: { width: collage.width, height: collage.height },
      }),
    telegram: () => postTelegram({ caption, imageBuffer: collage.buffer }),
    pinterest: () =>
      postPinterest({
        caption,
        imageBuffer: collage.buffer,
        quote: quotes[0],
        title: `Week in review · ${quotes.map((q) => `#${q.n}`).join(' ')}`,
        link: site,
        altText: `Week in review collage: ${quotes.map((q) => `#${q.n}`).join(', ')}`,
      }),
  }

  const results = []

  await Promise.all(
    WEEK_COLLAGE_NETWORKS.map(async (id) => {
      const meta = status[id]
      if (!meta?.ready) {
        logInfo('Week review publish: skip network', { id, reason: 'not configured' })
        results.push({ id, label: meta?.label || id, ok: false, error: 'Not configured' })
        return
      }
      try {
        logInfo('Week review publish: posting collage', { id })
        const posted = await collageProviders[id]()
        const row = { id, label: meta.label, ok: true, url: posted?.url || null }
        await recordPost(slug, row)
        results.push(row)
        logInfo('Week review publish: collage ok', { id, url: row.url })
      } catch (err) {
        logError('Week review publish: collage failed', err, { id })
        const row = { id, label: meta.label, ok: false, error: err.message || 'Failed' }
        await recordPost(slug, row)
        results.push(row)
      }
    })
  )

  if (status.youtube?.ready) {
    try {
      logInfo('Week review publish: encoding YouTube Short')
      const { video, poster } = await encodeWeekShort(
        quotes.map((quote, i) => ({ quote, imageBuffer: buffers[i] }))
      )
      logInfo('Week review publish: uploading YouTube', { bytes: video.length })
      const posted = await postYouTube({
        caption,
        quote: quotes[0],
        video,
        poster,
        title: `Week in review · ${range.weekKey}`,
      })
      const row = {
        id: 'youtube',
        label: status.youtube.label,
        ok: true,
        url: posted?.url || null,
        privacy: posted?.privacy || null,
      }
      await recordPost(slug, row)
      results.push(row)
      logInfo('Week review publish: YouTube ok', { url: row.url })
    } catch (err) {
      logError('Week review publish: YouTube failed', err)
      const row = { id: 'youtube', label: status.youtube.label, ok: false, error: err.message || 'Failed' }
      await recordPost(slug, row)
      results.push(row)
    }
  } else {
    results.push({ id: 'youtube', label: status.youtube?.label || 'YouTube', ok: false, error: 'Not configured' })
  }

  if (status.threads?.ready) {
    try {
      logInfo('Week review publish: Threads thread', { count: quotes.length })
      const items = await Promise.all(
        quotes.map(async (quote) => ({
          imageUrl: absoluteImageUrl(quote.src),
          caption: await quoteCaption(quote),
        }))
      )
      const thread = await postThreadsThread(items)
      const row = {
        id: 'threads',
        label: status.threads.label,
        ok: true,
        url: thread?.url || null,
        count: thread?.ids?.length || quotes.length,
      }
      await recordPost(slug, row)
      results.push(row)
      logInfo('Week review publish: Threads ok', { url: row.url, count: row.count, ids: thread?.ids })
    } catch (err) {
      logError('Week review publish: Threads failed', err, {
        partial: err.partial?.ids?.length || 0,
        expected: quotes.length,
      })
      const row = {
        id: 'threads',
        label: status.threads.label,
        ok: false,
        error: err.message || 'Failed',
        url: err.partial?.url || null,
        count: err.partial?.ids?.length || 0,
      }
      await recordPost(slug, row)
      results.push(row)
    }
  } else {
    results.push({ id: 'threads', label: status.threads?.label || 'Threads', ok: false, error: 'Not configured' })
  }

  let email = null
  try {
    logInfo('Week review publish: sending digest email', { quotes: quotes.length })
    email = await notifyQuoteDigest(quotes)
    logInfo('Week review publish: email done', email)
  } catch (err) {
    logError('Week review publish: email failed', err)
    email = { sent: 0, failed: 0, error: err.message || 'Failed' }
  }

  logInfo('Week review publish: done', {
    slug,
    results: results.map((r) => `${r.id}:${r.ok ? 'ok' : r.error}`),
  })

  return {
    skipped: false,
    range: publicRange(range),
    quotes: quotes.map((q) => ({ slug: q.slug, n: q.n })),
    collage: collageSrc,
    results,
    email,
  }
}
