import { getQuote, listQuotes } from '@/libs/content'
import { cleanupSuppressedNewsletterSubscribers } from '@/libs/newsletter-cleanup'
import { notifyQuoteSubscribers } from '@/libs/newsletter'
import { logError, logInfo } from '@/libs/logger'
import {
  findEmailCandidateSchedulesForUtcDay,
  utcDayRange,
} from '@/libs/social/schedule-store'

function successCount(schedule) {
  return (schedule?.results || []).filter((row) => row?.ok).length
}

function rankEmailSchedules(schedules) {
  return [...schedules].sort((a, b) => {
    const aDone = a.status === 'done' ? 1 : 0
    const bDone = b.status === 'done' ? 1 : 0
    if (bDone !== aDone) return bDone - aDone
    const byOk = successCount(b) - successCount(a)
    if (byOk) return byOk
    return new Date(a.runAt).getTime() - new Date(b.runAt).getTime()
  })
}

/** Public quote published during this UTC day (gap-day / failed-schedule fallback). */
async function findQuotePublishedOnUtcDay(now = new Date()) {
  const { start, end } = utcDayRange(now)
  const quotes = await listQuotes()
  const today = quotes
    .filter((quote) => {
      if (!quote?.slug || !quote?.src) return false
      const t = new Date(quote.publishAt || 0).getTime()
      return Number.isFinite(t) && t >= start.getTime() && t < end.getTime()
    })
    .sort((a, b) => (Number(b.n) || 0) - (Number(a.n) || 0))
  return today[0] || null
}

/**
 * Quote for the daily email cron (100 Resend recipients / day).
 * Prefer today's strongest done schedule; else a failed attempt; else a quote published today.
 * @returns {Promise<{ quote: object, source: string }|null>}
 */
export async function pickQuoteForEmailCron(now = new Date()) {
  const schedules = await findEmailCandidateSchedulesForUtcDay(now)
  for (const schedule of rankEmailSchedules(schedules)) {
    const slug = schedule?.slug ? String(schedule.slug).trim() : ''
    if (!slug) continue
    const quote = await getQuote(slug)
    if (quote?.slug && quote?.src) {
      return {
        quote,
        source: schedule.status === 'failed' ? 'social_schedule_failed' : 'social_schedule',
      }
    }
    logInfo('Quote email cron: social slug not public/usable', { slug, status: schedule.status })
  }

  const published = await findQuotePublishedOnUtcDay(now)
  if (published) return { quote: published, source: 'published_today' }

  return null
}

/** @deprecated use pickQuoteForEmailCron */
export async function pickQuotesForEmailCron(now = new Date()) {
  const picked = await pickQuoteForEmailCron(now)
  if (!picked?.quote) return null
  return { quotes: [picked.quote], source: picked.source }
}

/**
 * Daily quote email cron: up to 100 eligible subscribers (shared 30-day rotation).
 * Skips only when there is no today's card to send.
 */
export async function runQuoteEmailCron(now = new Date()) {
  const picked = await pickQuoteForEmailCron(now)
  if (!picked?.quote) {
    logInfo('Quote email cron skipped', { reason: 'no_quote_today' })
    return { skipped: true, reason: 'no_quote_today' }
  }

  const { quote, source } = picked
  const result = await notifyQuoteSubscribers(quote)
  logInfo('Quote email cron finished', {
    slug: quote.slug,
    n: quote.n,
    source,
    sent: result.sent,
    failed: result.failed,
    total: result.total,
    eligible: result.eligible,
  })

  return {
    skipped: false,
    slug: quote.slug,
    n: quote.n,
    source,
    ...result,
  }
}

async function runCleanup(label) {
  try {
    const cleanup = await cleanupSuppressedNewsletterSubscribers()
    logInfo(`Newsletter cron: ${label}`, cleanup)
    return cleanup
  } catch (error) {
    logError(`Newsletter cron: ${label} failed`, error)
    return { error: error.message || 'cleanup failed' }
  }
}

/**
 * Full daily email pipeline: suppression sync → quote mail → sync again.
 * Shared by /api/cron/social (after social) and manual /api/cron/newsletter.
 */
export async function runNewsletterCronPipeline(now = new Date()) {
  const cleanupBefore = await runCleanup('suppression cleanup (before send)')
  const result = await runQuoteEmailCron(now)
  const cleanupAfter = await runCleanup('suppression cleanup (after send)')
  return { cleanupBefore, cleanupAfter, ...result }
}
