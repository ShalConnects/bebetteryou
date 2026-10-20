import { getQuote } from '@/libs/content'
import { cleanupSuppressedNewsletterSubscribers } from '@/libs/newsletter-cleanup'
import { notifyQuoteSubscribers } from '@/libs/newsletter'
import { logError, logInfo } from '@/libs/logger'
import { findEarliestDoneScheduleForUtcDay } from '@/libs/social/schedule-store'

/**
 * Quote for the daily email cron: only today's earliest successful social send
 * (scheduled cron or immediate dashboard Post). No fallback to latest public.
 * @returns {Promise<{ quote: object, source: 'social_schedule' }|null>}
 */
export async function pickQuoteForEmailCron(now = new Date()) {
  const schedule = await findEarliestDoneScheduleForUtcDay(now)
  const scheduledSlug = schedule?.slug ? String(schedule.slug).trim() : ''
  if (!scheduledSlug) return null

  const fromSocial = await getQuote(scheduledSlug)
  if (fromSocial?.slug && fromSocial?.src) {
    return { quote: fromSocial, source: 'social_schedule' }
  }

  logInfo('Quote email cron: social slug not public/usable', { slug: scheduledSlug })
  return null
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
