import { isQuotePublic } from '@/libs/quote-visibility'
import { logInfo } from '@/libs/logger'
import { postQuote, readyNetworks } from '@/libs/social'
import { hasOkNetworkPostInUtcDay, readPostsBySlugs } from '@/libs/social/post-store'
import { readQuotes } from '@/libs/quotes-store'
import { postVerseShort } from '@/libs/social/verse-short'

/** Off when `YOUTUBE_DAILY_SHORTS` is 0 / false / off. Unset = on. */
export function dailyYoutubeShortsEnabled() {
  const raw = String(process.env.YOUTUBE_DAILY_SHORTS ?? '').trim().toLowerCase()
  if (!raw) return true
  return !(raw === '0' || raw === 'false' || raw === 'off' || raw === 'no')
}

function isWeekReviewSlug(slug) {
  return String(slug || '').startsWith('week-')
}

/** Public single-quote cards, oldest `n` first. */
function shortableQuotes(quotes) {
  return (quotes || [])
    .filter((q) => q?.slug && isQuotePublic(q) && !isWeekReviewSlug(q.slug))
    .sort((a, b) => (Number(a.n) || 0) - (Number(b.n) || 0))
}

const notOnYoutube = (quotes, postsBySlug = {}) => shortableQuotes(quotes).filter((q) => !postsBySlug[q.slug]?.youtube?.ok)

/** Public single-quote cards not yet ok on YouTube, oldest `n` first. */
export function pickNextQuoteForYoutubeShort(quotes, postsBySlug = {}) {
  return notOnYoutube(quotes, postsBySlug)[0] || null
}

export function countYoutubeShortsBacklog(quotes, postsBySlug = {}) {
  return notOnYoutube(quotes, postsBySlug).length
}

/** Single-quote Short already ok on YouTube this UTC day (manual or cron). */
export async function youtubeShortPostedUtcDay(now = new Date()) {
  return hasOkNetworkPostInUtcDay('youtube', { now, excludeSlugPrefix: 'week-' })
}

/**
 * Daily YouTube-only Short: next public quote without youtube.ok.
 * Does not publish drafts. Manual YouTube posts still allowed (and count for today).
 */
export async function runDailyYoutubeShort({ now = new Date() } = {}) {
  if (!dailyYoutubeShortsEnabled()) {
    logInfo('Daily YouTube Short skipped', { reason: 'disabled' })
    return { skipped: true, reason: 'disabled' }
  }

  const statusList = await readyNetworks()
  const youtube = statusList.find((n) => n.id === 'youtube')
  if (!youtube?.ready) {
    logInfo('Daily YouTube Short skipped', { reason: 'youtube_not_ready' })
    return { skipped: true, reason: 'youtube_not_ready' }
  }

  if (await youtubeShortPostedUtcDay(now)) {
    logInfo('Daily YouTube Short skipped', { reason: 'already_posted_today' })
    return { skipped: true, reason: 'already_posted_today' }
  }

  const quotes = await readQuotes()
  const postsBySlug = await readPostsBySlugs(quotes.map((q) => q.slug).filter(Boolean))
  const backlog = countYoutubeShortsBacklog(quotes, postsBySlug)
  const next = pickNextQuoteForYoutubeShort(quotes, postsBySlug)

  // Every card is already up: post a quote + passage pairing instead (one per quote × tradition).
  if (!next) {
    const verse = await postVerseShort(shortableQuotes(quotes), now.getTime())
    if (!verse) {
      logInfo('Daily YouTube Short skipped', { reason: 'empty_queue', backlog: 0 })
      return { skipped: true, reason: 'empty_queue', backlog: 0 }
    }
    const { ok, url = null, error = '', slug, tradition } = verse.result
    logInfo('Daily verse Short finished', { key: verse.key, ok, url, error })
    return { skipped: false, kind: 'verse', ok, slug, tradition, url, error, backlog: 0, results: [verse.result] }
  }

  const results = await postQuote(next.slug, ['youtube'])
  const yt = results.find((r) => r.id === 'youtube') || results[0]
  const ok = Boolean(yt?.ok)

  logInfo('Daily YouTube Short finished', {
    slug: next.slug,
    n: next.n,
    ok,
    url: yt?.url || null,
    error: yt?.error || '',
    backlogRemaining: ok ? Math.max(0, backlog - 1) : backlog,
  })

  return {
    skipped: false,
    ok,
    slug: next.slug,
    n: next.n,
    url: yt?.url || null,
    error: yt?.error || '',
    backlog,
    backlogRemaining: ok ? Math.max(0, backlog - 1) : backlog,
    results,
  }
}
