import { connectDB } from '@/libs/mongo'
import { logInfo } from '@/libs/logger'
import { unsubscribeNewsletterSubscriber } from '@/libs/newsletter'
import NewsletterDeliveryEvent from '@/models/NewsletterDeliveryEvent'

const RESEND_API = 'https://api.resend.com'

function normalizeEmail(email) {
  return String(email || '')
    .toLowerCase()
    .trim()
}

/**
 * Paginate Resend suppressions (bounce / complaint / manual).
 * Uses REST — SDK 4.x may not expose suppressions yet.
 * @param {{ origins?: string[], limit?: number }} [opts]
 * @returns {Promise<{ email: string, origin: string }[]>}
 */
export async function listResendSuppressions({
  origins = ['bounce', 'complaint'],
  limit = 100,
} = {}) {
  const key = (process.env.RESEND_API_KEY || '').trim()
  if (!key) throw new Error('RESEND_API_KEY is not configured')

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
      out.push({ email, origin })
    }

    if (!body?.has_more || !rows.length) break
    after = String(rows[rows.length - 1]?.id || '')
    if (!after) break
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
 */
export async function cleanupSuppressedNewsletterSubscribers() {
  const fromResend = await listResendSuppressions({ origins: ['bounce', 'complaint'] })
  const fromLocal = await listLocalDeliveryBadEmails()

  const byEmail = new Map()
  for (const row of fromResend) {
    byEmail.set(row.email, row.origin)
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
    local: fromLocal.length,
    unique: byEmail.size,
    unsubscribed,
    already,
    missing,
  })

  return {
    resendCount: fromResend.length,
    localCount: fromLocal.length,
    unique: byEmail.size,
    unsubscribed,
    already,
    missing,
    samples,
  }
}
