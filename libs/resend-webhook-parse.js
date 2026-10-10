/** Unwrap Resend/Svix envelopes so handlers always see `{ type, data }`. */
export function normalizeResendWebhookEvent(event) {
  if (!event || typeof event !== 'object') return event
  if (event.data && typeof event.data === 'object' && (event.type || event.event_type)) {
    return event
  }
  if (event.payload && typeof event.payload === 'object') {
    return normalizeResendWebhookEvent(event.payload)
  }
  return event
}

/** Pull a recipient email from common Resend webhook fields. */
export function recipientFromResendData(data) {
  if (!data || typeof data !== 'object') return ''

  const candidates = [data.to, data.email, data.recipient, data.address]
  for (const raw of candidates) {
    if (Array.isArray(raw) && raw.length) {
      const first = String(raw[0] || '')
        .toLowerCase()
        .trim()
      // "Name <email@x.com>" or bare email
      const angled = first.match(/<([^>]+@[^>]+)>/)
      if (angled) return angled[1].toLowerCase().trim()
      if (first.includes('@')) return first
    }
    if (typeof raw === 'string') {
      const s = raw.toLowerCase().trim()
      const angled = s.match(/<([^>]+@[^>]+)>/)
      if (angled) return angled[1].toLowerCase().trim()
      if (s.includes('@')) return s
    }
  }
  return ''
}

/** Normalize / infer Resend webhook event type (body type can be missing in some deliveries). */
export function resolveResendEventType(event) {
  const normalized = normalizeResendWebhookEvent(event)
  if (!normalized || typeof normalized !== 'object') return ''

  const candidates = [normalized.type, normalized.event_type, event?.type, event?.event_type]
  for (const raw of candidates) {
    const t = String(raw || '')
      .trim()
      .toLowerCase()
    if (t === 'email.bounced' || t === 'email.complained') return t
  }

  const data = resendEventData(normalized)
  // Shape fallback — bounce object means a bounce even if `type` was omitted.
  if (data.bounce || normalized.bounce || event?.bounce) return 'email.bounced'

  return String(normalized.type || event?.type || '')
    .trim()
    .toLowerCase()
}

export function resendEventData(event) {
  const normalized = normalizeResendWebhookEvent(event)
  if (normalized?.data && typeof normalized.data === 'object') return normalized.data
  return normalized && typeof normalized === 'object' ? normalized : {}
}
