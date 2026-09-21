/** First recipient email from a Resend webhook `data.to` field. */
export function recipientFromResendData(data) {
  const to = data?.to
  if (Array.isArray(to) && to.length) return String(to[0] || '').toLowerCase().trim()
  if (typeof to === 'string') return to.toLowerCase().trim()
  return ''
}

/** Normalize / infer Resend webhook event type (body type can be missing in some deliveries). */
export function resolveResendEventType(event) {
  if (!event || typeof event !== 'object') return ''

  const candidates = [event.type, event.event_type]
  for (const raw of candidates) {
    const t = String(raw || '')
      .trim()
      .toLowerCase()
    if (t === 'email.bounced' || t === 'email.complained') return t
  }

  // Shape fallback — bounce object means a bounce even if `type` was omitted.
  if (event.data?.bounce || event.bounce) return 'email.bounced'

  return String(event.type || '')
    .trim()
    .toLowerCase()
}

export function resendEventData(event) {
  if (event?.data && typeof event.data === 'object') return event.data
  return event && typeof event === 'object' ? event : {}
}
