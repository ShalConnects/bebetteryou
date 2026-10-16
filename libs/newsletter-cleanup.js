import { connectDB } from '@/libs/mongo'
import { logError, logInfo } from '@/libs/logger'
import { unsubscribeNewsletterSubscriber } from '@/libs/newsletter'
import { upsertNewsletterDeliveryEvent } from '@/libs/resend-webhook'
import NewsletterDeliveryEvent from '@/models/NewsletterDeliveryEvent'

const RESEND_API = 'https://api.resend.com'

async function resolveResendWebhookId() {
  const configured = (process.env.RESEND_WEBHOOK_ID || '').trim()
  if (configured) return configured
  const key = resendKey()
  const res = await fetch(`${RESEND_API}/webhooks`, {
    headers: { Authorization: `Bearer ${key}` },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) return ''
  const rows = Array.isArray(body?.data) ? body.data : []
  const bounceHook = rows.find((row) =>
    Array.isArray(row?.events) ? row.events.includes('email.bounced') : false
  )
  return String(bounceHook?.id || rows[0]?.id || '')
}

function normalizeEmail(email) {
  return String(email || '')
    .toLowerCase()
    .trim()
}

function resendKey() {
  const key = (process.env.RESEND_API_KEY || '').trim()
  if (!key) throw new Error('RESEND_API_KEY is not configured')
  return key
}

/**
 * Paginate Resend suppressions (bounce / complaint / manual).
 * Uses REST — SDK 4.x may not expose suppressions yet.
 * @param {{ origins?: string[], limit?: number }} [opts]
 * @returns {Promise<{ email: string, origin: string, sourceId?: string, createdAt?: string }[]>}
 */
export async function listResendSuppressions({
  origins = ['bounce', 'complaint'],
  limit = 100,
} = {}) {
  const key = resendKey()
  const wanted = new Set(origins.map(String))
  const out = []
  let after = ''
  let pages = 0
  const maxPages = 50

  while (pages < maxPages) {
    pages += 1
    const params = new URLSearchParams({ limit: String(Math.min(Math.max(limit, 1), 100)) })
    if (after) params.set('after', after)
    const res = await fetch(`${RESEND_API}/suppressions?${params}`, {
      headers: { Authorization: `Bearer ${key}` },
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      const msg = body?.message || body?.error || `Resend suppressions failed (${res.status})`
      throw new Error(msg)
    }

    const rows = Array.isArray(body?.data) ? body.data : []
    for (const row of rows) {
      const email = normalizeEmail(row?.email)
      const origin = String(row?.origin || '')
      if (!email || !wanted.has(origin)) continue
      out.push({
        email,
        origin,
        sourceId: row?.source_id ? String(row.source_id) : undefined,
        createdAt: row?.created_at || undefined,
      })
    }

    if (!body?.has_more || !rows.length) break
    after = String(rows[rows.length - 1]?.id || '')
    if (!after) break
  }

  return out
}

/**
 * Recent Resend emails whose last_event is bounce/complaint (includes soft bounces
 * that never land on the suppressions list).
 */
export async function listRecentResendBadEmails({ maxPages = 10 } = {}) {
  const key = resendKey()
  const out = []
  let after = ''

  for (let page = 0; page < maxPages; page++) {
    const params = new URLSearchParams({ limit: '100' })
    if (after) params.set('after', after)
    const res = await fetch(`${RESEND_API}/emails?${params}`, {
      headers: { Authorization: `Bearer ${key}` },
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      const msg = body?.message || body?.error || `Resend emails failed (${res.status})`
      throw new Error(msg)
    }

    const rows = Array.isArray(body?.data) ? body.data : []
    for (const row of rows) {
      const event = String(row?.last_event || '').toLowerCase()
      if (event !== 'bounced' && event !== 'complained') continue
      const recipients = Array.isArray(row?.to) ? row.to : [row?.to]
      for (const raw of recipients) {
        const email = normalizeEmail(raw)
        if (!email) continue
        out.push({
          email,
          type: event === 'complained' ? 'complained' : 'bounced',
          emailId: row?.id ? String(row.id) : undefined,
          subject: row?.subject || undefined,
          createdAt: row?.created_at || undefined,
        })
      }
    }

    if (!body?.has_more || !rows.length) break
    after = String(rows[rows.length - 1]?.id || '')
    if (!after) break
  }

  return out
}

/**
 * Pull bounce/complaint webhook event payloads from Resend (full bounce details).
 * Works even when our endpoint previously no-op'd them.
 */
/**
 * Recent bounce/complaint webhook payloads (for bounce type/message detail).
 * Capped — each event needs a detail fetch, so keep this small for cron budgets.
 */
export async function listResendWebhookBadEvents({
  webhookId,
  maxEvents = 40,
} = {}) {
  const key = resendKey()
  const id = String(webhookId || (await resolveResendWebhookId()) || '').trim()
  if (!id) return []

  const listRes = await fetch(`${RESEND_API}/webhooks/${id}/events?limit=100`, {
    headers: { Authorization: `Bearer ${key}` },
  })
  const listBody = await listRes.json().catch(() => ({}))
  if (!listRes.ok) {
    if (listRes.status === 404 || listRes.status === 403) return []
    const msg =
      listBody?.message || listBody?.error || `Resend webhook events failed (${listRes.status})`
    throw new Error(msg)
  }

  const candidates = (Array.isArray(listBody?.data) ? listBody.data : [])
    .filter((row) => {
      const type = String(row?.type || '').toLowerCase()
      return type === 'email.bounced' || type === 'email.complained'
    })
    .slice(0, maxEvents)

  const out = []
  // Small concurrency to stay under cron time without serial round-trips.
  const chunkSize = 8
  for (let i = 0; i < candidates.length; i += chunkSize) {
    const chunk = candidates.slice(i, i + chunkSize)
    const details = await Promise.all(
      chunk.map(async (row) => {
        const detailRes = await fetch(`${RESEND_API}/webhooks/${id}/events/${row.id}`, {
          headers: { Authorization: `Bearer ${key}` },
        })
        const detail = await detailRes.json().catch(() => ({}))
        const envelope = detail?.payload && typeof detail.payload === 'object' ? detail.payload : detail
        const data = envelope?.data && typeof envelope.data === 'object' ? envelope.data : {}
        const email = normalizeEmail(Array.isArray(data.to) ? data.to[0] : data.to)
        if (!email) return null
        const bounce = data.bounce || {}
        const type = String(row?.type || '').toLowerCase()
        return {
          email,
          type: type === 'email.complained' ? 'complained' : 'bounced',
          emailId: data.email_id ? String(data.email_id) : undefined,
          subject: data.subject || undefined,
          bounceType: bounce.type || undefined,
          bounceSubType: bounce.subType || undefined,
          message: bounce.message || undefined,
          createdAt: data.created_at || envelope.created_at || row.created_at,
        }
      })
    )
    for (const row of details) {
      if (row) out.push(row)
    }
  }

  return out
}

/** Distinct bounced/complained emails already stored from webhooks. */
export async function listLocalDeliveryBadEmails() {
  await connectDB()
  const rows = await NewsletterDeliveryEvent.aggregate([
    { $match: { type: { $in: ['bounced', 'complained'] } } },
    { $group: { _id: { $toLower: '$email' } } },
  ])
  return rows.map((r) => normalizeEmail(r._id)).filter(Boolean)
}

/**
 * Soft-unsubscribe newsletter leads that Resend suppressed (bounce/complaint)
 * and any already recorded in our delivery-events collection.
 * Also backfills the Bounces & spam dashboard from Resend so a dead webhook
 * cannot leave the UI empty again.
 */
export async function cleanupSuppressedNewsletterSubscribers() {
  const fromResend = await listResendSuppressions({ origins: ['bounce', 'complaint'] })

  let fromEmails = []
  let fromWebhook = []
  try {
    fromEmails = await listRecentResendBadEmails({ maxPages: 5 })
  } catch (error) {
    logError('Failed to list recent Resend bounce emails', error)
  }
  try {
    fromWebhook = await listResendWebhookBadEvents({ maxEvents: 40 })
  } catch (error) {
    logError('Failed to list Resend webhook bounce events', error)
  }

  let eventsUpserted = 0
  for (const row of fromWebhook) {
    try {
      await upsertNewsletterDeliveryEvent(row)
      eventsUpserted += 1
    } catch (error) {
      if (error?.code !== 11000) {
        logError('Failed to upsert webhook bounce event', error, { email: row.email })
      }
    }
  }
  for (const row of fromEmails) {
    try {
      await upsertNewsletterDeliveryEvent({
        email: row.email,
        type: row.type,
        emailId: row.emailId,
        subject: row.subject,
        message: row.type === 'complained' ? 'Marked as spam' : 'Email bounced',
        createdAt: row.createdAt,
      })
      eventsUpserted += 1
    } catch (error) {
      if (error?.code !== 11000) {
        logError('Failed to upsert email bounce event', error, { email: row.email })
      }
    }
  }
  for (const row of fromResend) {
    try {
      await upsertNewsletterDeliveryEvent({
        email: row.email,
        type: row.origin === 'complaint' ? 'complained' : 'bounced',
        emailId: row.sourceId,
        message: row.origin === 'complaint' ? 'Marked as spam' : 'Email bounced (suppression)',
        createdAt: row.createdAt,
      })
      eventsUpserted += 1
    } catch (error) {
      if (error?.code !== 11000) {
        logError('Failed to upsert suppression bounce event', error, { email: row.email })
      }
    }
  }

  const fromLocal = await listLocalDeliveryBadEmails()

  const byEmail = new Map()
  for (const row of fromResend) {
    byEmail.set(row.email, row.origin)
  }
  // Permanent-looking webhook/email rows also force unsubscribe.
  for (const row of fromWebhook) {
    if (!byEmail.has(row.email)) {
      const hard =
        row.type === 'complained' ||
        String(row.bounceType || '').toLowerCase() === 'permanent'
      if (hard) byEmail.set(row.email, row.type === 'complained' ? 'complaint' : 'bounce')
    }
  }
  for (const email of fromLocal) {
    if (!byEmail.has(email)) byEmail.set(email, 'local_event')
  }

  let unsubscribed = 0
  let already = 0
  let missing = 0
  const samples = []

  for (const [email, origin] of byEmail) {
    const result = await unsubscribeNewsletterSubscriber(email)
    if (!result?.ok) {
      missing += 1
      continue
    }
    if (result.already) {
      already += 1
    } else {
      unsubscribed += 1
      if (samples.length < 20) samples.push({ email, origin })
    }
  }

  logInfo('Newsletter suppression cleanup finished', {
    resend: fromResend.length,
    emails: fromEmails.length,
    webhookEvents: fromWebhook.length,
    local: fromLocal.length,
    eventsUpserted,
    unique: byEmail.size,
    unsubscribed,
    already,
    missing,
  })

  return {
    resendCount: fromResend.length,
    emailBounceCount: fromEmails.length,
    webhookEventCount: fromWebhook.length,
    localCount: fromLocal.length,
    eventsUpserted,
    unique: byEmail.size,
    unsubscribed,
    already,
    missing,
    samples,
  }
}
