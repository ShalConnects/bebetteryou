import { getQuote, listQuotes } from '@/libs/content'
import { notifyQuoteSubscribers } from '@/libs/newsletter'
import { logInfo } from '@/libs/logger'
import { findEarliestDoneScheduleForUtcDay } from '@/libs/social/schedule-store'

/** Newest public quote by card number (same catalog the site shows). */
export async function pickLatestPublicQuote() {
  const quotes = await listQuotes()
  return (
    [...quotes]
      .filter((q) => q?.slug && q?.src)
      .sort((a, b) => (b.n || 0) - (a.n || 0))[0] || null
  )
}

/**
 * Prefer today's earliest successful social schedule card; else latest public by #.
 * @returns {Promise<{ quote: object, source: 'social_schedule'|'latest_public' }|null>}
 */
export async function pickQuoteForEmailCron(now = new Date()) {
  const schedule = await findEarliestDoneScheduleForUtcDay(now)
  const scheduledSlug = schedule?.slug ? String(schedule.slug).trim() : ''
  if (scheduledSlug) {
    const fromSocial = await getQuote(scheduledSlug)
    if (fromSocial?.slug && fromSocial?.src) {
      return { quote: fromSocial, source: 'social_schedule' }
    }
    logInfo('Quote email cron: social slug not public/usable, falling back', {
      slug: scheduledSlug,
    })
  }

  const latest = await pickLatestPublicQuote()
  if (!latest) return null
  return { quote: latest, source: 'latest_public' }
}

/**
 * Daily quote email cron: up to 100 eligible subscribers (shared 30-day rotation).
 * Prefers today's successful social schedule slug when available.
 */
export async function runQuoteEmailCron(now = new Date()) {
  const picked = await pickQuoteForEmailCron(now)
  if (!picked?.quote) {
    logInfo('Quote email cron skipped', { reason: 'no_quote' })
    return { skipped: true, reason: 'no_quote' }
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
