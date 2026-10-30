/** Print order lifecycle. Single source of truth for the model enum and guards. */
export const printOrderFlow = {
  draft: ['awaiting_payment', 'cancelled'],
  awaiting_payment: ['paid', 'payment_failed', 'cancelled'],
  /**
   * `shipped` is reachable straight from paid, and from a failed submit, because
   * Printful can accept and ship an order while our own status write is lost.
   * Without it a shipping webhook would be an illegal jump and strand the order.
   */
  paid: ['submitting', 'submitted', 'submit_failed', 'shipped'],
  /** Claimed by one submit call, so a double click or retry can't create a second Printful order. */
  submitting: ['submitted', 'submit_failed', 'shipped'],
  /** Printful can still cancel after accepting (out of stock, address problem). */
  submitted: ['fulfilled', 'shipped', 'submit_failed', 'cancelled'],
  fulfilled: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  payment_failed: [],
  /** Retryable by an admin from the dashboard. */
  submit_failed: ['submitting', 'submitted', 'shipped', 'cancelled'],
  cancelled: [],
}

export const printOrderStatuses = Object.keys(printOrderFlow)

export function canTransition(from, to) {
  return Boolean(printOrderFlow[from]?.includes(to))
}

/** Inverse of the flow: every state that may legally reach `status`. */
export function sourcesOf(status) {
  return printOrderStatuses.filter((from) => canTransition(from, status))
}

/** At or past hand-off to Printful — makes fulfillment safe to retry. */
export const handedOffStatuses = ['submitted', 'fulfilled', 'shipped', 'delivered']

export function isHandedOff(status) {
  return handedOffStatuses.includes(status)
}
