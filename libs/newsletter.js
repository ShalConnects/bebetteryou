import crypto from 'crypto'
import { getPost } from '@/libs/blog'
import { readBooks } from '@/libs/books-store'
import { logError } from '@/libs/logger'
import { connectDB } from '@/libs/mongo'
import Lead from '@/models/Lead'
import { pickNewsletterExtras } from '@/libs/newsletter-picks'
import { readQuotes } from '@/libs/quotes-store'
import { sendEmail } from '@/libs/resend'
import {
  DEFAULT_NEWSLETTER_PREFS,
  buildBlogEmail,
  buildBookEmail,
  buildQuoteEmail,
  buildWelcomeEmail,
  normalizePrefs,
} from '@/libs/newsletter-email'

export {
  DEFAULT_NEWSLETTER_PREFS,
  buildBlogEmail,
  buildBookEmail,
  buildQuoteEmail,
  buildWelcomeEmail,
  normalizePrefs,
} from '@/libs/newsletter-email'

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
    return true
  } catch (error) {
    logError('Newsletter send failed', error, { to, subject: payload.subject })
    return false
  }
}

export async function sendWelcomeIfNeeded(lead) {
  if (lead.welcomeSentAt) return false
  const prefs = normalizePrefs(lead.prefs)
  const extras = await pickNewsletterExtras()
  const payload = buildWelcomeEmail({ token: lead.unsubscribeToken, prefs, extras })
  const ok = await sendSoft(lead.email, payload)
  if (ok) {
    lead.welcomeSentAt = new Date()
    await lead.save()
  }
  return ok
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
    const ok = await sendSoft(lead.email, payload)
    return ok ? { ok: true, type } : { ok: false, error: 'Send failed' }
  }

  if (type === 'quote') {
    const quote = (await readQuotes()).find((q) => q.slug === slug)
    if (!quote?.src) return { ok: false, error: 'Quote not found' }
    const extras = await pickNewsletterExtras({ excludeQuoteSlug: quote.slug })
    const payload = buildQuoteEmail({ quote, token, extras })
    const ok = await sendSoft(lead.email, payload)
    return ok ? { ok: true, type } : { ok: false, error: 'Send failed' }
  }

  if (type === 'blog') {
    const post = getPost(slug)
    if (!post) return { ok: false, error: 'Post not found' }
    const extras = await pickNewsletterExtras({ excludePostSlug: post.slug })
    const payload = buildBlogEmail({ post, token, extras })
    const ok = await sendSoft(lead.email, payload)
    return ok ? { ok: true, type } : { ok: false, error: 'Send failed' }
  }

  if (type === 'book') {
    const book = readBooks().find((b) => b.slug === slug)
    if (!book) return { ok: false, error: 'Book not found' }
    const extras = await pickNewsletterExtras({ excludeBookSlug: book.slug })
    const payload = buildBookEmail({ book, token, extras })
    const ok = await sendSoft(lead.email, payload)
    return ok ? { ok: true, type } : { ok: false, error: 'Send failed' }
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
    if (await sendSoft(row.email, payload)) sent += 1
  }
  return { total: rows.length, sent }
}

export async function notifyQuoteSubscribers(quote) {
  const extras = await pickNewsletterExtras({ excludeQuoteSlug: quote.slug })
  return fanOut('quotes', (row) =>
    buildQuoteEmail({ quote, token: row.unsubscribeToken, extras })
  )
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
