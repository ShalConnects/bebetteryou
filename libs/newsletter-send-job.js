import { getPost } from '@/libs/blog'
import { readBooks } from '@/libs/books-store'
import { logError, logInfo } from '@/libs/logger'
import { connectDB } from '@/libs/mongo'
import { pickNewsletterExtras } from '@/libs/newsletter-picks'
import { readQuotes } from '@/libs/quotes-store'
import { sendSesEmail, sesConfigured } from '@/libs/ses'
import {
  buildBlogEmail,
  buildBookEmail,
  buildQuoteDigestEmail,
  buildQuoteEmail,
} from '@/libs/newsletter-email'
import Lead from '@/models/Lead'
import NewsletterSendFailure from '@/models/NewsletterSendFailure'
import NewsletterSendJob from '@/models/NewsletterSendJob'
import NewsletterSendReceipt from '@/models/NewsletterSendReceipt'

/** Recipients per wave. Small enough to finish inside a serverless invocation. */
export const SEND_JOB_WAVE_SIZE = 40

/** Pause between SES calls. Production SES is often ~14/sec; this stays under that. */
export const SES_SEND_GAP_MS = 70

const LOCK_MS = 2 * 60 * 1000

export function utcDayKey(now = new Date()) {
  return now.toISOString().slice(0, 10)
}

export function quoteContentKey(slugs) {
  const unique = [...new Set(slugs.map((slug) => String(slug || '').trim()).filter(Boolean))].sort()
  return `quote:${unique.join(',')}`
}

export function mergeSlugs(existing, incoming) {
  return [...new Set([...(existing || []), ...(incoming || [])].map((slug) => String(slug || '').trim()).filter(Boolean))]
}

/** Active subscribers for a pref. No 30-day cooldown — each update is its own job. */
export function activeAudienceFilter(prefKey) {
  return {
    source: 'newsletter',
    [`prefs.${prefKey}`]: true,
    unsubscribeToken: { $exists: true, $ne: null },
    $or: [{ unsubscribedAt: null }, { unsubscribedAt: { $exists: false } }],
  }
}

function prefForKind(kind) {
  if (kind === 'blog') return 'blog'
  if (kind === 'book') return 'books'
  return 'quotes'
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function appOrigin() {
  const site = (process.env.SITE_URL || process.env.NEXTAUTH_URL || '').trim()
  if (site) return site.replace(/\/$/, '')
  const vercel = (process.env.VERCEL_URL || '').trim()
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, '')}`
  return ''
}

/**
 * Queue a quote, blog, book, or digest for the whole list.
 * Same-day quotes merge into one email until the first recipient is sent.
 */
export async function enqueueNewsletterUpdate({ kind, slugs, dayKey, now = new Date() } = {}) {
  await connectDB()
  const clean = mergeSlugs([], slugs)
  if (!clean.length) return null
  const day = dayKey || utcDayKey(now)

  if (kind === 'quote') {
    const open = await NewsletterSendJob.findOne({
      kind: 'quote',
      dayKey: day,
      status: { $in: ['queued', 'sending'] },
      sent: 0,
    })
    if (open) {
      const merged = mergeSlugs(open.slugs, clean)
      open.slugs = merged
      open.contentKey = quoteContentKey(merged)
      open.updatedAt = new Date()
      await open.save()
      return open
    }
  }

  const contentKey = kind === 'quote' ? quoteContentKey(clean) : `${kind}:${clean.join(',')}`
  const existing = await NewsletterSendJob.findOne({
    contentKey,
    status: { $in: ['queued', 'sending', 'done'] },
  })
  if (existing) return existing

  const eligible = await Lead.countDocuments(activeAudienceFilter(prefForKind(kind)))
  return NewsletterSendJob.create({
    kind,
    contentKey,
    slugs: clean,
    dayKey: kind === 'quote' ? day : undefined,
    status: 'queued',
    eligible,
    createdAt: now,
    updatedAt: now,
  })
}

async function prepareMail(job) {
  if (job.kind === 'blog') {
    const post = getPost(job.slugs[0])
    if (!post) return null
    const extras = await pickNewsletterExtras({ excludePostSlug: post.slug })
    return (token) => buildBlogEmail({ post, token, extras })
  }

  if (job.kind === 'book') {
    const book = readBooks().find((row) => row.slug === job.slugs[0])
    if (!book) return null
    const extras = await pickNewsletterExtras({ excludeBookSlug: book.slug })
    return (token) => buildBookEmail({ book, token, extras })
  }

  const all = await readQuotes()
  const quotes = job.slugs
    .map((slug) => all.find((row) => row.slug === slug))
    .filter((row) => row?.slug && row?.src)
  if (!quotes.length) return null

  if (quotes.length === 1) {
    const extras = await pickNewsletterExtras({ excludeQuoteSlug: quotes[0].slug })
    return (token) => buildQuoteEmail({ quote: quotes[0], token, extras })
  }

  const extras = await pickNewsletterExtras({ quoteCount: 0 })
  const exclude = new Set(quotes.map((row) => row.slug))
  extras.quotes = (extras.quotes || []).filter((row) => !exclude.has(row.slug))
  return (token) =>
    buildQuoteDigestEmail({
      quotes,
      token,
      extras,
      limit: quotes.length,
    })
}

async function claimJob() {
  const stale = new Date(Date.now() - LOCK_MS)
  return NewsletterSendJob.findOneAndUpdate(
    {
      status: { $in: ['queued', 'sending'] },
      $or: [{ lockedAt: null }, { lockedAt: { $exists: false } }, { lockedAt: { $lt: stale } }],
    },
    { $set: { status: 'sending', lockedAt: new Date(), updatedAt: new Date() } },
    { sort: { createdAt: 1 }, new: true }
  )
}

async function releaseJob(job) {
  await NewsletterSendJob.updateOne({ _id: job._id }, { $set: { lockedAt: null, updatedAt: new Date() } })
}

/**
 * Mail the next wave of the oldest open job.
 * @returns {Promise<{ processed: boolean, remaining: boolean, sent: number, failed: number, eligible: number, status?: string, error?: string, quotes?: number }>}
 */
export async function processNewsletterSendWave() {
  await connectDB()
  const job = await claimJob()
  if (!job) return { processed: false, remaining: false, sent: 0, failed: 0, eligible: 0 }

  if (!sesConfigured()) {
    job.error = 'Amazon SES is not configured'
    job.lockedAt = null
    job.updatedAt = new Date()
    await job.save()
    return {
      processed: true,
      remaining: false,
      sent: job.sent,
      failed: job.failed,
      eligible: job.eligible,
      status: job.status,
      error: job.error,
      quotes: job.slugs?.length || 0,
    }
  }

  try {
    const render = await prepareMail(job)
    if (!render) {
      job.status = 'failed'
      job.error = 'Content not found'
      job.finishedAt = new Date()
      job.lockedAt = null
      job.updatedAt = new Date()
      await job.save()
      return {
        processed: true,
        remaining: false,
        sent: job.sent,
        failed: job.failed,
        eligible: job.eligible,
        status: 'failed',
        error: job.error,
      }
    }

    const filter = activeAudienceFilter(prefForKind(job.kind))
    if (job.cursor) filter._id = { $gt: job.cursor }
    const leads = await Lead.find(filter)
      .sort({ _id: 1 })
      .limit(SEND_JOB_WAVE_SIZE)
      .select({ email: 1, unsubscribeToken: 1 })
      .lean()

    if (!leads.length) {
      job.status = 'done'
      job.finishedAt = new Date()
      job.lockedAt = null
      job.updatedAt = new Date()
      await job.save()
      logInfo('Newsletter send job finished', { contentKey: job.contentKey, sent: job.sent, failed: job.failed })
      return {
        processed: true,
        remaining: false,
        sent: job.sent,
        failed: job.failed,
        eligible: job.eligible,
        status: 'done',
        quotes: job.slugs?.length || 0,
      }
    }

    const emails = leads.map((row) => row.email)
    const already = await NewsletterSendReceipt.find({
      contentKey: job.contentKey,
      email: { $in: emails },
    })
      .select({ email: 1 })
      .lean()
    const skip = new Set(already.map((row) => row.email))

    let sent = 0
    let failed = 0
    const failures = []
    let firstSend = true

    for (const lead of leads) {
      if (skip.has(lead.email)) continue
      if (!firstSend) await sleep(SES_SEND_GAP_MS)
      firstSend = false
      const payload = render(lead.unsubscribeToken)
      try {
        await sendSesEmail({ to: lead.email, ...payload })
        await NewsletterSendReceipt.create({
          contentKey: job.contentKey,
          email: lead.email,
          status: 'sent',
        })
        sent += 1
      } catch (error) {
        failed += 1
        try {
          await NewsletterSendReceipt.create({
            contentKey: job.contentKey,
            email: lead.email,
            status: 'failed',
          })
        } catch (receiptError) {
          if (receiptError?.code !== 11000) {
            logError('Failed to store newsletter receipt', receiptError, { email: lead.email })
          }
        }
        failures.push({
          email: lead.email,
          kind: job.kind,
          slug: job.slugs?.[0],
          subject: payload?.subject,
          error: error.message || 'Send failed',
          createdAt: new Date(),
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

    const last = leads[leads.length - 1]
    const more = leads.length === SEND_JOB_WAVE_SIZE
    job.cursor = last._id
    job.sent += sent
    job.failed += failed
    job.status = more ? 'sending' : 'done'
    if (!more) job.finishedAt = new Date()
    job.lockedAt = null
    job.updatedAt = new Date()
    job.error = undefined
    await job.save()

    return {
      processed: true,
      remaining: more,
      sent: job.sent,
      failed: job.failed,
      eligible: job.eligible,
      status: job.status,
      quotes: job.slugs?.length || 0,
    }
  } catch (error) {
    logError('Newsletter send wave failed', error, { contentKey: job.contentKey })
    await releaseJob(job)
    throw error
  }
}

/** Keep sending until the time budget runs out or the queue is idle. */
export async function processNewsletterSendQueue({ maxMs = 45000 } = {}) {
  const started = Date.now()
  let last = { processed: false, remaining: false, sent: 0, failed: 0, eligible: 0 }
  while (Date.now() - started < maxMs) {
    last = await processNewsletterSendWave()
    if (!last.processed || !last.remaining || last.error) break
  }
  return last
}

/** Start another invocation so a long list finishes after this function returns. */
export function kickNewsletterSendQueue() {
  if (process.env.JEST_WORKER_ID) return
  const origin = appOrigin()
  const secret = (process.env.CRON_SECRET || '').trim()
  if (!origin || !secret) return
  fetch(`${origin}/api/cron/newsletter-send`, {
    headers: { authorization: `Bearer ${secret}` },
  }).catch((error) => logError('Failed to continue newsletter send', error))
}

export async function startNewsletterSend() {
  const result = await processNewsletterSendQueue({ maxMs: 20000 })
  if (result.remaining && !result.error) kickNewsletterSendQueue()
  return result
}

export async function hasOpenNewsletterSend() {
  await connectDB()
  const job = await NewsletterSendJob.findOne({ status: { $in: ['queued', 'sending'] } })
    .select({ _id: 1 })
    .lean()
  return Boolean(job)
}
