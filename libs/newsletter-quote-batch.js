/** Quote / digest batch size per admin send. */
export const QUOTE_EMAIL_BATCH_SIZE = 100

/** Do not email the same subscriber again within this many days (any quote mail). */
export const QUOTE_EMAIL_COOLDOWN_DAYS = 30

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
