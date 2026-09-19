import crypto from 'crypto'
import { getPost } from '@/libs/blog'
import { readBooks } from '@/libs/books-store'
import { logError } from '@/libs/logger'
import { connectDB } from '@/libs/mongo'
import Lead from '@/models/Lead'
import NewsletterSendFailure from '@/models/NewsletterSendFailure'
import {
  QUOTE_EMAIL_BATCH_SIZE,
  eligibleQuoteSubscriberFilter,
} from '@/libs/newsletter-quote-batch'
import { pickNewsletterExtras, pickQuoteDigest } from '@/libs/newsletter-picks'
import { readQuotes } from '@/libs/quotes-store'
import { sendEmail, formatEmailError } from '@/libs/resend'
import {
  NEWSLETTER_IMPORT_MAX,
  parseNewsletterImportCsv,
} from '@/libs/newsletter-import'
import {
  buildBlogEmail,
  buildBookEmail,
  buildQuoteDigestEmail,
  buildQuoteEmail,
  buildWelcomeEmail,
  normalizePrefs,
} from '@/libs/newsletter-email'

export {
  DEFAULT_NEWSLETTER_PREFS,
  buildBlogEmail,
  buildBookEmail,
  buildQuoteDigestEmail,
  buildQuoteEmail,
  buildWelcomeEmail,
  normalizePrefs,
} from '@/libs/newsletter-email'

export {
  QUOTE_EMAIL_BATCH_SIZE,
  QUOTE_EMAIL_COOLDOWN_DAYS,
  eligibleQuoteSubscriberFilter,
  quoteEmailCooldownCutoff,
} from '@/libs/newsletter-quote-batch'

export function newUnsubscribeToken() {
  return crypto.randomBytes(24).toString('hex')
}

export async function upsertNewsletterSubscriber({ email, prefs }) {
  await connectDB()
  const nextPrefs = normalizePrefs(prefs)
  const existing = await Lead.findOne({ email, source: 'newsletter' })

  if (existing) {
    const token = existing.unsubscribeToken || newUnsubscribeToken()
    existing.prefs = nextPrefs
    existing.unsubscribeToken = token
    existing.unsubscribedAt = null
    existing.updatedAt = new Date()
    await existing.save()
    return { lead: existing, created: false }
  }

  const lead = await Lead.create({
    email,
    source: 'newsletter',
    prefs: nextPrefs,
    unsubscribeToken: newUnsubscribeToken(),
  })
  return { lead, created: true }
}

export async function findByUnsubscribeToken(token) {
  if (!token) return null
  await connectDB()
  return Lead.findOne({ source: 'newsletter', unsubscribeToken: token })
}

export async function findNewsletterByEmail(email) {
  if (!email) return null
  await connectDB()
  return Lead.findOne({ source: 'newsletter', email: String(email).toLowerCase().trim() })
}

export async function applyNewsletterManage({ token, prefs, unsubscribe }) {
  const lead = await findByUnsubscribeToken(token)
  if (!lead) return null

  if (unsubscribe) {
    lead.prefs = { quotes: false, blog: false, books: false }
    lead.unsubscribedAt = new Date()
  } else if (prefs) {
    lead.prefs = normalizePrefs(prefs)
    const any = lead.prefs.quotes || lead.prefs.blog || lead.prefs.books
    lead.unsubscribedAt = any ? null : new Date()
  }
  lead.updatedAt = new Date()
  await lead.save()
  return lead
}

async function activeSubscribers(prefKey) {
  await connectDB()
  return Lead.find({
    source: 'newsletter',
    $or: [{ unsubscribedAt: null }, { unsubscribedAt: { $exists: false } }],
    [`prefs.${prefKey}`]: true,
    unsubscribeToken: { $exists: true, $ne: null },
  }).lean()
}

async function sendSoft(to, payload) {
  try {
    await sendEmail({ to, ...payload })
    return { ok: true }
  } catch (error) {
    logError('Newsletter send failed', error, { to, subject: payload.subject })
    return { ok: false, error: formatEmailError(error) }
  }
}

export async function sendWelcomeIfNeeded(lead) {
  if (lead.welcomeSentAt) return false
  const prefs = normalizePrefs(lead.prefs)
  const extras = await pickNewsletterExtras()
  const payload = buildWelcomeEmail({ token: lead.unsubscribeToken, prefs, extras })
  const result = await sendSoft(lead.email, payload)
  if (result.ok) {
    lead.welcomeSentAt = new Date()
    await lead.save()
  }
  return result.ok
}

/** Admin test — one recipient; does not change welcomeSentAt or fan out. */
export async function sendTestNewsletter({ email, type, slug }) {
  const lead = await findNewsletterByEmail(email)
  if (!lead?.unsubscribeToken) return { ok: false, error: 'Subscriber not found' }

  const token = lead.unsubscribeToken
  const prefs = normalizePrefs(lead.prefs)

  if (type === 'welcome') {
    const extras = await pickNewsletterExtras()
    const payload = buildWelcomeEmail({ token, prefs, extras })
    const result = await sendSoft(lead.email, payload)
    return result.ok ? { ok: true, type } : { ok: false, error: 'Send failed' }
  }

  if (type === 'quote') {
    const quote = (await readQuotes()).find((q) => q.slug === slug)
    if (!quote?.src) return { ok: false, error: 'Quote not found' }
    const extras = await pickNewsletterExtras({ excludeQuoteSlug: quote.slug })
    const payload = buildQuoteEmail({ quote, token, extras })
    const result = await sendSoft(lead.email, payload)
    return result.ok ? { ok: true, type } : { ok: false, error: 'Send failed' }
  }

  if (type === 'blog') {
    const post = getPost(slug)
    if (!post) return { ok: false, error: 'Post not found' }
    const extras = await pickNewsletterExtras({ excludePostSlug: post.slug })
    const payload = buildBlogEmail({ post, token, extras })
    const result = await sendSoft(lead.email, payload)
    return result.ok ? { ok: true, type } : { ok: false, error: 'Send failed' }
  }

  if (type === 'book') {
    const book = readBooks().find((b) => b.slug === slug)
    if (!book) return { ok: false, error: 'Book not found' }
    const extras = await pickNewsletterExtras({ excludeBookSlug: book.slug })
    const payload = buildBookEmail({ book, token, extras })
    const result = await sendSoft(lead.email, payload)
    return result.ok ? { ok: true, type } : { ok: false, error: 'Send failed' }
  }

  return { ok: false, error: 'Unknown template' }
}

/** @deprecated use sendTestNewsletter({ type: 'welcome' }) */
export async function sendTestWelcome(email) {
  return sendTestNewsletter({ email, type: 'welcome' })
}

async function fanOut(prefKey, build) {
  const rows = await activeSubscribers(prefKey)
  let sent = 0
  for (const row of rows) {
    const payload = build(row)
    if ((await sendSoft(row.email, payload)).ok) sent += 1
  }
  return { total: rows.length, sent }
}

/**
 * Claim up to `limit` eligible leads for a quote/digest send.
 * Sets lastQuoteEmailedAt immediately so concurrent clicks / crashes cannot double-mail.
 */
async function claimQuoteEmailBatch(limit = QUOTE_EMAIL_BATCH_SIZE) {
  await connectDB()
  const size = Math.max(0, Math.min(Number(limit) || QUOTE_EMAIL_BATCH_SIZE, QUOTE_EMAIL_BATCH_SIZE))
  if (!size) return { rows: [], eligible: 0, claimedAt: null }

  const filter = eligibleQuoteSubscriberFilter()
  const eligible = await Lead.countDocuments(filter)
  if (!eligible) return { rows: [], eligible: 0, claimedAt: null }

  const sampled = await Lead.aggregate([
    { $match: filter },
    { $sample: { size: Math.min(size, eligible) } },
    { $project: { _id: 1 } },
  ])
  if (!sampled.length) return { rows: [], eligible, claimedAt: null }

  const ids = sampled.map((r) => r._id)
  const claimedAt = new Date()
  const claimId = crypto.randomBytes(12).toString('hex')
  // Re-check eligibility in the update so a concurrent claim cannot win the same lead.
  const claimResult = await Lead.updateMany(
    { _id: { $in: ids }, ...filter },
    { $set: { lastQuoteEmailedAt: claimedAt, lastQuoteClaimId: claimId, updatedAt: claimedAt } }
  )

  if (!claimResult.modifiedCount) {
    return { rows: [], eligible, claimedAt }
  }

  const rows = await Lead.find({ lastQuoteClaimId: claimId })
    .select({ email: 1, unsubscribeToken: 1 })
    .lean()

  return { rows, eligible, claimedAt }
}

/**
 * Send quote/digest to up to 100 eligible subscribers.
 * Claims (stamps lastQuoteEmailedAt) before Resend so failures / crashes still count
 * toward the 30-day cooldown. Failures are logged for the dashboard.
 */
async function fanOutQuoteBatch(build, { kind, slug }) {
  const { rows, eligible, claimedAt } = await claimQuoteEmailBatch(QUOTE_EMAIL_BATCH_SIZE)
  if (!rows.length) {
    return { total: 0, sent: 0, failed: 0, eligible, batchSize: QUOTE_EMAIL_BATCH_SIZE }
  }

  const recordedAt = claimedAt || new Date()
  let sent = 0
  const failures = []

  for (const row of rows) {
    const payload = build(row)
    const result = await sendSoft(row.email, payload)
    if (result.ok) {
      sent += 1
    } else {
      failures.push({
        email: row.email,
        kind,
        slug: slug || undefined,
        subject: payload?.subject,
        error: result.error || 'Send failed',
        createdAt: recordedAt,
      })
    }
  }

  if (failures.length) {
    try {
      await NewsletterSendFailure.insertMany(failures, { ordered: false })
    } catch (error) {
      logError('Failed to record newsletter send failures', error, { count: failures.length })
    }
  }

  return {
    total: rows.length,
    sent,
    failed: failures.length,
    eligible,
    batchSize: QUOTE_EMAIL_BATCH_SIZE,
  }
}

export async function notifyQuoteSubscribers(quote) {
  const extras = await pickNewsletterExtras({ excludeQuoteSlug: quote.slug })
  return fanOutQuoteBatch(
    (row) => buildQuoteEmail({ quote, token: row.unsubscribeToken, extras }),
    { kind: 'quote', slug: quote.slug }
  )
}

/** Manual roundup — newest public cards. Not called on quote create. */
export async function notifyQuoteDigest(count = 6) {
  const quotes = await pickQuoteDigest(count)
  if (!quotes.length) return { total: 0, sent: 0, failed: 0, quotes: 0, eligible: 0 }
  const exclude = new Set(quotes.map((q) => q.slug))
  const extras = await pickNewsletterExtras({ quoteCount: 0 })
  extras.quotes = extras.quotes.filter((q) => !exclude.has(q.slug))
  const result = await fanOutQuoteBatch(
    (row) => buildQuoteDigestEmail({ quotes, token: row.unsubscribeToken, extras }),
    { kind: 'digest', slug: quotes.map((q) => q.slug).join(',') }
  )
  return { ...result, quotes: quotes.length }
}

export async function notifyBlogSubscribers(post) {
  const extras = await pickNewsletterExtras({ excludePostSlug: post.slug })
  return fanOut('blog', (row) => buildBlogEmail({ post, token: row.unsubscribeToken, extras }))
}

export async function notifyBookSubscribers(book) {
  const extras = await pickNewsletterExtras({ excludeBookSlug: book.slug })
  return fanOut('books', (row) => buildBookEmail({ book, token: row.unsubscribeToken, extras }))
}

export async function listNewsletterSubscribers() {
  await connectDB()
  return Lead.find({ source: 'newsletter' })
    .select('-unsubscribeToken')
    .sort({ createdAt: -1 })
    .lean()
}

/** Recent Resend failures from quote/digest batches (for admin dashboard). */
export async function listQuoteSendFailures(limit = 100) {
  await connectDB()
  const n = Math.min(Math.max(Number(limit) || 100, 1), 500)
  return NewsletterSendFailure.find()
    .sort({ createdAt: -1 })
    .limit(n)
    .lean()
}

/** Soft-unsubscribe by email (admin). Keeps the lead row. */
export async function unsubscribeNewsletterSubscriber(email) {
  await connectDB()
  const normalized = String(email || '')
    .toLowerCase()
    .trim()
  if (!normalized) return { ok: false }
  const lead = await Lead.findOne({ email: normalized, source: 'newsletter' })
  if (!lead) return { ok: false }
  lead.prefs = { quotes: false, blog: false, books: false }
  lead.unsubscribedAt = new Date()
  lead.updatedAt = new Date()
  await lead.save()
  return { ok: true, lead }
}

/** Hard-delete a newsletter lead only (never contact-form leads). */
export async function deleteNewsletterSubscriber(email) {
  await connectDB()
  const normalized = String(email || '')
    .toLowerCase()
    .trim()
  if (!normalized) return { deleted: false }
  const result = await Lead.deleteOne({ email: normalized, source: 'newsletter' })
  return { deleted: result.deletedCount > 0 }
}

/**
 * Bulk upsert opted-in newsletter subscribers from CSV / line list.
 * Does not send welcome mail. Requires parse + size checks first.
 */
export async function importNewsletterSubscribers(rows) {
  await connectDB()
  const list = Array.isArray(rows) ? rows : []
  if (!list.length) {
    return { created: 0, updated: 0, total: 0 }
  }
  if (list.length > NEWSLETTER_IMPORT_MAX) {
    const err = new Error(`Import limited to ${NEWSLETTER_IMPORT_MAX} emails per upload`)
    err.status = 400
    throw err
  }

  const now = new Date()
  const ops = list.map(({ email, prefs }) => {
    const token = newUnsubscribeToken()
    return {
      updateOne: {
        filter: { email, source: 'newsletter' },
        update: [
          {
            $set: {
              prefs: normalizePrefs(prefs),
              unsubscribedAt: null,
              updatedAt: now,
              unsubscribeToken: { $ifNull: ['$unsubscribeToken', token] },
              email,
              source: 'newsletter',
              createdAt: { $ifNull: ['$createdAt', now] },
              // Imports are existing opt-ins — never queue a welcome blast.
              welcomeSentAt: { $ifNull: ['$welcomeSentAt', now] },
            },
          },
        ],
        upsert: true,
      },
    }
  })

  const result = await Lead.bulkWrite(ops, { ordered: false })
  const created = result.upsertedCount || 0
  const updated = result.modifiedCount || 0
  return { created, updated, total: list.length }
}

export { NEWSLETTER_IMPORT_MAX, parseNewsletterImportCsv }
