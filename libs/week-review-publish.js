import { getSiteUrl } from '@/libs/site-url'
import { saveAsset } from '@/libs/asset-store'
import { readQuotes } from '@/libs/quotes-store'
import { notifyQuoteDigest } from '@/libs/newsletter'
import { logError, logInfo } from '@/libs/logger'
import { readyNetworks, quoteCaption, resolveQuoteImageBuffer } from '@/libs/social'
import { postInstagramCarousel } from '@/libs/social/providers/instagram'
import { postFacebook } from '@/libs/social/providers/facebook'
import { postBluesky, clipBlueskyText } from '@/libs/social/providers/bluesky'
import { postTelegram } from '@/libs/social/providers/telegram'
import { postPinterest } from '@/libs/social/providers/pinterest'
import { postThreadsThread } from '@/libs/social/providers/threads'
import { postYouTube } from '@/libs/social/providers/youtube'
import { encodeWeekShort } from '@/libs/social/quote-short'
import { readPostsBySlugs, recordPost } from '@/libs/social/post-store'
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

const WEEK_TARGETS = ['instagram', ...WEEK_COLLAGE_NETWORKS, 'youtube', 'threads']

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
            : n.id === 'instagram'
              ? 'carousel'
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
 * Manual Friday publish: IG carousel, collage → FB/Bluesky/Telegram/Pinterest,
 * Short → YT, Threads reply chain, digest email.
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
  const cardImageUrls = quotes.map((q) => absoluteImageUrl(q.src))

  const collageProviders = {
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

  // A re-run (button or Friday cron) only retries networks that haven't posted this week.
  const done = (await readPostsBySlugs([slug]))[slug] || {}
  const firstRun = !Object.values(done).some((p) => p.ok)
  const results = []

  /** One network: skip if not ready or already posted; log and record the outcome. */
  async function run(id, post) {
    const meta = status[id]
    if (!meta?.ready) return results.push({ id, label: meta?.label || id, ok: false, error: 'Not configured' })
    if (done[id]?.ok) return results.push({ id, label: meta.label, ok: true, url: done[id].url || null, already: true })
    let row
    try {
      logInfo('Week review publish: posting', { id })
      row = { id, label: meta.label, ok: true, ...(await post()) }
      logInfo('Week review publish: ok', { id, url: row.url })
    } catch (err) {
      logError('Week review publish: failed', err, { id })
      // Threads can fail mid-thread: keep the link to what did post.
      row = { id, label: meta.label, ok: false, error: err.message || 'Failed', url: err.partial?.url || null }
    }
    await recordPost(slug, row)
    results.push(row)
  }

  await run('instagram', async () => ({
    url: (await postInstagramCarousel({ imageUrls: cardImageUrls, caption }))?.url || null,
  }))

  await Promise.all(
    WEEK_COLLAGE_NETWORKS.map((id) => run(id, async () => ({ url: (await collageProviders[id]())?.url || null })))
  )

  await run('youtube', async () => {
    const { video, poster } = await encodeWeekShort(quotes.map((quote, i) => ({ quote, imageBuffer: buffers[i] })))
    const posted = await postYouTube({
      caption,
      quote: quotes[0],
      video,
      poster,
      title: `Week in review · ${range.weekKey}`,
      weekReview: true,
    })
    return {
      url: posted?.url || null,
      privacy: posted?.privacy || null,
      ...(posted?.thumbnail === false ? { thumbnailError: posted.thumbnailError || 'Thumbnail not set' } : {}),
    }
  })

  await run('threads', async () => {
    const items = await Promise.all(
      quotes.map(async (quote) => ({
        imageUrl: absoluteImageUrl(quote.src),
        caption: await quoteCaption(quote, 'threads'),
      }))
    )
    const thread = await postThreadsThread(items)
    return { url: thread?.url || null, count: thread?.ids?.length || quotes.length }
  })

  // Subscribers get the digest once, on the first run.
  let email = { skipped: true, reason: 'already sent' }
  if (firstRun) {
    try {
      logInfo('Week review publish: sending digest email', { quotes: quotes.length })
      email = await notifyQuoteDigest(quotes)
      logInfo('Week review publish: email done', email)
    } catch (err) {
      logError('Week review publish: email failed', err)
      email = { sent: 0, failed: 0, error: err.message || 'Failed' }
    }
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
