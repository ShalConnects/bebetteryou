import { getQuote } from '@/libs/content'
import { cleanupSuppressedNewsletterSubscribers } from '@/libs/newsletter-cleanup'
import { notifyQuoteSubscribers } from '@/libs/newsletter'
import { logError, logInfo } from '@/libs/logger'
import { findDoneSchedulesForUtcDay } from '@/libs/social/schedule-store'

function successCount(schedule) {
  return (schedule?.results || []).filter((row) => row?.ok).length
}

/**
 * Quote for the daily email cron: today's strongest successful social send.
 * Prefers the card with the most network successes so one-off test posts
 * (e.g. LinkedIn-only) do not steal the daily email.
 * @returns {Promise<{ quote: object, source: 'social_schedule' }|null>}
 */
export async function pickQuoteForEmailCron(now = new Date()) {
  const schedules = await findDoneSchedulesForUtcDay(now)
  if (!schedules.length) return null

  const ranked = [...schedules].sort((a, b) => {
    const byOk = successCount(b) - successCount(a)
    if (byOk) return byOk
    return new Date(a.runAt).getTime() - new Date(b.runAt).getTime()
  })

  for (const schedule of ranked) {
    const slug = schedule?.slug ? String(schedule.slug).trim() : ''
    if (!slug) continue
    const quote = await getQuote(slug)
    if (quote?.slug && quote?.src) {
      return { quote, source: 'social_schedule' }
    }
    logInfo('Quote email cron: social slug not public/usable', { slug })
  }
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
 * Skips the day unless social posted successfully today.
 */
export async function runQuoteEmailCron(now = new Date()) {
  const picked = await pickQuoteForEmailCron(now)
  if (!picked?.quote) {
    logInfo('Quote email cron skipped', { reason: 'no_social_send' })
    return { skipped: true, reason: 'no_social_send' }
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
 * Shared by /api/cron/social (after social/YT) and manual /api/cron/newsletter.
 */
export async function runNewsletterCronPipeline(now = new Date()) {
  const cleanupBefore = await runCleanup('suppression cleanup (before send)')
  const result = await runQuoteEmailCron(now)
  const cleanupAfter = await runCleanup('suppression cleanup (after send)')
  return { cleanupBefore, cleanupAfter, ...result }
}
