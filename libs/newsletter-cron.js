import { listQuotes } from '@/libs/content'
import { notifyQuoteSubscribers } from '@/libs/newsletter'
import { logInfo } from '@/libs/logger'

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
 * Daily quote email cron: send the latest public card to up to 100 eligible subscribers
 * (shared 30-day rotation with manual notify / digest).
 */
export async function runQuoteEmailCron() {
  const quote = await pickLatestPublicQuote()
  if (!quote) {
    logInfo('Quote email cron skipped', { reason: 'no_quote' })
    return { skipped: true, reason: 'no_quote' }
  }

  const result = await notifyQuoteSubscribers(quote)
  logInfo('Quote email cron finished', {
    slug: quote.slug,
    n: quote.n,
    sent: result.sent,
    failed: result.failed,
    total: result.total,
    eligible: result.eligible,
  })

  return {
    skipped: false,
    slug: quote.slug,
    n: quote.n,
    ...result,
  }
}
