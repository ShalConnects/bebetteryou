/** Quote / digest batch size per admin send. */
export const QUOTE_EMAIL_BATCH_SIZE = 100

/** Do not email the same subscriber again within this many days (any quote mail). */
export const QUOTE_EMAIL_COOLDOWN_DAYS = 30

/**
 * Resend allows ~10 requests/second. Gap between sends keeps fan-out under that.
 * 125ms ⇒ ~8 req/s with headroom.
 */
export const RESEND_SEND_GAP_MS = 125

/** Extra wait before one retry when Resend returns a rate-limit error. */
export const RESEND_RATE_LIMIT_RETRY_MS = 1000

export function isResendRateLimitError(message) {
  return /too many requests|rate limit/i.test(String(message || ''))
}

export function quoteEmailCooldownCutoff(now = new Date()) {
  return new Date(now.getTime() - QUOTE_EMAIL_COOLDOWN_DAYS * 24 * 60 * 60 * 1000)
}

/** Match active quote subscribers eligible for another quote/digest send. */
export function eligibleQuoteSubscriberFilter(now = new Date()) {
  const cutoff = quoteEmailCooldownCutoff(now)
  return {
    source: 'newsletter',
    'prefs.quotes': true,
    unsubscribeToken: { $exists: true, $ne: null },
    $and: [
      { $or: [{ unsubscribedAt: null }, { unsubscribedAt: { $exists: false } }] },
      {
        $or: [
          { lastQuoteEmailedAt: null },
          { lastQuoteEmailedAt: { $exists: false } },
          { lastQuoteEmailedAt: { $lt: cutoff } },
        ],
      },
    ],
  }
}
