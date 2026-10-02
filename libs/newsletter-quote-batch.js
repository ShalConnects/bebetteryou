/** Pref notify / digest batch size per admin send. */
export const QUOTE_EMAIL_BATCH_SIZE = 100

/** Alias — blog/book use the same batch cap. */
export const PREF_EMAIL_BATCH_SIZE = QUOTE_EMAIL_BATCH_SIZE

/** Do not email the same subscriber again within this many days (per channel). */
export const QUOTE_EMAIL_COOLDOWN_DAYS = 30

export const PREF_EMAIL_COOLDOWN_DAYS = QUOTE_EMAIL_COOLDOWN_DAYS

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

export const prefEmailCooldownCutoff = quoteEmailCooldownCutoff

/**
 * Active newsletter leads for a pref who are outside the channel cooldown.
 * @param {'quotes'|'blog'|'books'} prefKey
 * @param {string} lastField e.g. lastQuoteEmailedAt
 */
export function eligiblePrefSubscriberFilter(prefKey, lastField, now = new Date()) {
  const cutoff = prefEmailCooldownCutoff(now)
  return {
    source: 'newsletter',
    [`prefs.${prefKey}`]: true,
    unsubscribeToken: { $exists: true, $ne: null },
    $and: [
      { $or: [{ unsubscribedAt: null }, { unsubscribedAt: { $exists: false } }] },
      {
        $or: [
          { [lastField]: null },
          { [lastField]: { $exists: false } },
          { [lastField]: { $lt: cutoff } },
        ],
      },
    ],
  }
}

/** Match active quote subscribers eligible for another quote/digest send. */
export function eligibleQuoteSubscriberFilter(now = new Date()) {
  return eligiblePrefSubscriberFilter('quotes', 'lastQuoteEmailedAt', now)
}

export function eligibleBlogSubscriberFilter(now = new Date()) {
  return eligiblePrefSubscriberFilter('blog', 'lastBlogEmailedAt', now)
}

export function eligibleBookSubscriberFilter(now = new Date()) {
  return eligiblePrefSubscriberFilter('books', 'lastBookEmailedAt', now)
}
