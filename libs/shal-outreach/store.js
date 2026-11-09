import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { connectDB } from '@/libs/mongo'
import { DAILY_CAP, isValidEmail, parseList } from './letter.js'
import {
  ShalOutreachContact,
  ShalOutreachEvent,
  ShalOutreachLock,
  ShalOutreachRemoved,
  ShalOutreachSent,
  ShalOutreachStop,
} from '@/models/ShalOutreach'

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function searchClause(q) {
  const query = String(q || '').trim()
  if (!query) return null
  const escaped = escapeRegex(query)
  return {
    $or: [{ email: { $regex: escaped, $options: 'i' } }, { name: { $regex: escaped, $options: 'i' } }],
  }
}

function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase()
}

function annotateContacts(rows, sentMap, stopMap) {
  return rows.map((r) => {
    const email = r.email
    const stop = stopMap.get(email)
    const sent = sentMap.get(email)
    let status = 'unsent'
    if (stop) status = 'stopped'
    else if (sent) status = 'sent'
    return {
      email,
      name: r.name || '',
      status,
      reason: stop?.reason || '',
      sentDay: sent?.day || null,
      createdAt: r.createdAt || null,
      updatedAt: r.updatedAt || null,
    }
  })
}

async function mapsForEmails(emails) {
  if (!emails.length) return { sentMap: new Map(), stopMap: new Map() }
  const [sentRows, stopRows] = await Promise.all([
    ShalOutreachSent.find({ email: { $in: emails } }, { email: 1, day: 1, _id: 0 }).lean(),
    ShalOutreachStop.find({ email: { $in: emails } }, { email: 1, reason: 1, _id: 0 }).lean(),
  ])
  return {
    sentMap: new Map(sentRows.map((r) => [r.email, r])),
    stopMap: new Map(stopRows.map((r) => [r.email, r])),
  }
}

const day = () => new Date().toISOString().slice(0, 10)
const SEND_GAP_MS = Number(process.env.SHALCONNECTS_OUTREACH_SEND_GAP_MS ?? 200)
const LOCK_MS = 10 * 60 * 1000

export function dailyCap() {
  return Number(process.env.SHALCONNECTS_OUTREACH_DAILY_CAP ?? DAILY_CAP)
}

export function sendGapMs() {
  return Number.isFinite(SEND_GAP_MS) ? Math.max(0, SEND_GAP_MS) : 200
}

function unsubSecret() {
  return (
    process.env.SHALCONNECTS_UNSUB_SECRET?.trim() ||
    process.env.SHALCONNECTS_RESEND_API_KEY?.trim() ||
    ''
  )
}

export function siteOrigin() {
  const raw =
    process.env.NEXTAUTH_URL ||
    process.env.SITE_URL ||
    process.env.VERCEL_URL ||
    'http://localhost:3000'
  const withProto = raw.startsWith('http') ? raw : `https://${raw}`
  return withProto.replace(/\/$/, '')
}

export function signUnsub(email) {
  const secret = unsubSecret()
  if (!secret) return ''
  return createHmac('sha256', secret).update(String(email).toLowerCase().trim()).digest('hex').slice(0, 32)
}

export function verifyUnsubSig(email, sig) {
  const expected = signUnsub(email)
  if (!expected || !sig) return false
  try {
    const a = Buffer.from(String(sig))
    const b = Buffer.from(expected)
    return a.length === b.length && timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export function unsubUrlFor(email) {
  const e = encodeURIComponent(String(email).toLowerCase().trim())
  const t = signUnsub(email)
  if (!t) return ''
  return `${siteOrigin()}/api/outreach/unsub?email=${e}&t=${t}`
}

export async function appendRemoved(rows) {
  if (!rows?.length) return
  await connectDB()
  const today = day()
  try {
    await ShalOutreachRemoved.insertMany(
      rows.map((r) => ({
        email: String(r.email || '').toLowerCase().trim(),
        reason: r.reason || '',
        day: today,
      })),
      { ordered: false }
    )
  } catch {
    /* ignore bulk partial errors */
  }
}

export async function loadAudience() {
  await connectDB()
  const rows = await ShalOutreachContact.find({}).sort({ createdAt: 1 }).lean()
  return {
    people: rows.map((r) => ({ email: r.email, name: r.name || '' })),
    removed: [],
    listMissing: rows.length === 0,
  }
}

export async function loadSentEmails() {
  await connectDB()
  return ShalOutreachSent.find({}, { email: 1, day: 1, _id: 0 }).lean()
}

export async function loadStoppedEmails() {
  await connectDB()
  const rows = await ShalOutreachStop.find({}, { email: 1, _id: 0 }).lean()
  return rows.map((r) => r.email)
}

export async function markSent(email) {
  await connectDB()
  const e = String(email).toLowerCase().trim()
  await ShalOutreachSent.updateOne(
    { email: e },
    { $setOnInsert: { email: e, day: day() } },
    { upsert: true }
  )
}

export async function addUnsubscribe(email, reason = 'unsubscribe') {
  await connectDB()
  const e = String(email || '').trim().toLowerCase()
  if (!e.includes('@')) return { added: false, email: e }
  const existing = await ShalOutreachStop.findOne({ email: e }).lean()
  if (existing) return { added: false, email: e }
  await ShalOutreachStop.create({ email: e, reason })
  await appendRemoved([{ email: e, reason }])
  return { added: true, email: e }
}

export async function recordDeliveryEvent({
  email,
  type,
  emailId,
  bounceType,
  bounceSubType,
  message,
  createdAt,
}) {
  await connectDB()
  const normalizedEmail = String(email || '').toLowerCase().trim()
  if (!normalizedEmail) return { stored: false, unsubscribed: false, email: '', type: '' }
  if (type !== 'bounced' && type !== 'complained') {
    return { stored: false, unsubscribed: false, email: normalizedEmail, type }
  }

  const doc = {
    email: normalizedEmail,
    type,
    bounceType: bounceType || undefined,
    bounceSubType: bounceSubType || undefined,
    message: message || (type === 'complained' ? 'Marked as spam' : 'Email bounced'),
    createdAt: createdAt ? new Date(createdAt) : new Date(),
  }
  const idKey = emailId ? String(emailId) : ''
  if (idKey) doc.emailId = idKey

  try {
    await ShalOutreachEvent.create(doc)
  } catch (error) {
    if (error?.code === 11000) {
      const unsub = await addUnsubscribe(normalizedEmail, type)
      return { stored: false, unsubscribed: unsub.added, email: normalizedEmail, type, duplicate: true }
    }
    throw error
  }

  await addUnsubscribe(normalizedEmail, type)
  return { stored: true, unsubscribed: true, email: normalizedEmail, type }
}

/** @param {'merge'|'replace'} mode */
export async function importPeople(csvText, { mode = 'merge' } = {}) {
  await connectDB()
  const { people, removed } = parseList(csvText)
  // Don't flood Removed with every CSV duplicate; keep invalid / no-email only.
  await appendRemoved(removed.filter((r) => r.reason === 'invalid' || r.reason === 'no-email'))

  if (mode === 'replace') {
    await ShalOutreachContact.deleteMany({})
  }

  const BATCH = 2000
  let upserted = 0
  for (let i = 0; i < people.length; i += BATCH) {
    const slice = people.slice(i, i + BATCH)
    await ShalOutreachContact.bulkWrite(
      slice.map((person) => ({
        updateOne: {
          filter: { email: person.email },
          update: {
            $set: { name: person.name || '' },
            $setOnInsert: { email: person.email },
          },
          upsert: true,
        },
      })),
      { ordered: false }
    )
    upserted += slice.length
  }

  return {
    peopleCount: people.length,
    removed,
    upserted,
    mode,
    invalidCount: removed.filter((r) => r.reason === 'invalid' || r.reason === 'no-email').length,
    duplicateCount: removed.filter((r) => r.reason === 'duplicate').length,
  }
}

export async function acquireSendLock() {
  await connectDB()
  const now = new Date()
  const lockedUntil = new Date(now.getTime() + LOCK_MS)
  const owner = randomBytes(8).toString('hex')

  const current = await ShalOutreachLock.findById('send').lean()
  if (current?.lockedUntil && current.lockedUntil > now) {
    throw Object.assign(new Error('Send already in progress. Wait and try again.'), { status: 409 })
  }

  await ShalOutreachLock.findByIdAndUpdate(
    'send',
    {
      lockedUntil,
      owner,
      progress: {
        phase: 'preparing',
        total: 0,
        done: 0,
        failed: 0,
        startedAt: now,
        finishedAt: null,
        currentEmail: '',
        lastError: '',
        avgMs: 0,
        etaSeconds: null,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
  const stored = await ShalOutreachLock.findById('send').lean()
  if (!stored || stored.owner !== owner) {
    throw Object.assign(new Error('Send already in progress. Wait and try again.'), { status: 409 })
  }
  return owner
}

export async function updateSendProgress(owner, patch = {}) {
  await connectDB()
  const $set = {}
  for (const [key, value] of Object.entries(patch)) {
    $set[`progress.${key}`] = value
  }
  // Keep lock alive for long batches.
  if (patch.phase === 'sending' || patch.phase === 'preparing') {
    $set.lockedUntil = new Date(Date.now() + LOCK_MS)
  }
  const filter = owner ? { _id: 'send', owner } : { _id: 'send' }
  await ShalOutreachLock.updateOne(filter, { $set })
}

export async function getSendProgress() {
  await connectDB()
  const doc = await ShalOutreachLock.findById('send').lean()
  const now = Date.now()
  const active = Boolean(doc?.lockedUntil && doc.lockedUntil.getTime() > now && doc.owner)
  const p = doc?.progress || {}
  const total = Number(p.total) || 0
  const done = Number(p.done) || 0
  const failed = Number(p.failed) || 0
  const avgMs = Number(p.avgMs) || 0
  const remaining = Math.max(0, total - done - failed)
  const etaSeconds =
    p.etaSeconds != null
      ? p.etaSeconds
      : avgMs > 0 && remaining > 0
        ? Math.ceil((remaining * avgMs) / 1000)
        : remaining > 0
          ? null
          : 0

  return {
    active,
    phase: p.phase || (active ? 'preparing' : 'idle'),
    total,
    done,
    failed,
    startedAt: p.startedAt || null,
    finishedAt: p.finishedAt || null,
    currentEmail: p.currentEmail || '',
    lastError: p.lastError || '',
    avgMs,
    etaSeconds,
    percent: total > 0 ? Math.min(100, Math.round(((done + failed) / total) * 100)) : 0,
  }
}

export async function releaseSendLock(owner, finalProgress = null) {
  await connectDB()
  const $set = {
    owner: '',
    lockedUntil: new Date(0),
  }
  if (finalProgress) {
    for (const [key, value] of Object.entries(finalProgress)) {
      $set[`progress.${key}`] = value
    }
  }
  await ShalOutreachLock.updateOne({ _id: 'send', owner }, { $set })
}

/**
 * Paginated contact browser with status.
 * @param {{ q?: string, filter?: 'all'|'unsent'|'sent'|'stopped', page?: number, pageSize?: number }} opts
 */
export async function listContacts({ q = '', filter = 'all', page = 1, pageSize = 50 } = {}) {
  await connectDB()
  const size = Math.min(100, Math.max(1, Number(pageSize) || 50))
  const pageNum = Math.max(1, Number(page) || 1)
  const skip = (pageNum - 1) * size
  const query = String(q || '').trim()
  const mode = ['all', 'unsent', 'sent', 'stopped'].includes(filter) ? filter : 'all'
  const emailSearch = query ? { email: { $regex: escapeRegex(query), $options: 'i' } } : {}

  if (mode === 'stopped') {
    const [total, rows] = await Promise.all([
      ShalOutreachStop.countDocuments(emailSearch),
      ShalOutreachStop.find(emailSearch).sort({ createdAt: -1 }).skip(skip).limit(size).lean(),
    ])
    const emails = rows.map((r) => r.email)
    const contacts = await ShalOutreachContact.find({ email: { $in: emails } }).lean()
    const byEmail = new Map(contacts.map((c) => [c.email, c]))
    const { sentMap } = await mapsForEmails(emails)
    return {
      total,
      page: pageNum,
      pageSize: size,
      filter: mode,
      q: query,
      contacts: rows.map((r) => ({
        email: r.email,
        name: byEmail.get(r.email)?.name || '',
        status: 'stopped',
        reason: r.reason || 'unsubscribe',
        sentDay: sentMap.get(r.email)?.day || null,
        createdAt: byEmail.get(r.email)?.createdAt || r.createdAt || null,
        updatedAt: byEmail.get(r.email)?.updatedAt || null,
      })),
    }
  }

  if (mode === 'sent') {
    const [total, rows] = await Promise.all([
      ShalOutreachSent.countDocuments(emailSearch),
      ShalOutreachSent.find(emailSearch).sort({ createdAt: -1 }).skip(skip).limit(size).lean(),
    ])
    const emails = rows.map((r) => r.email)
    const contacts = await ShalOutreachContact.find({ email: { $in: emails } }).lean()
    const byEmail = new Map(contacts.map((c) => [c.email, c]))
    const { stopMap } = await mapsForEmails(emails)
    return {
      total,
      page: pageNum,
      pageSize: size,
      filter: mode,
      q: query,
      contacts: rows.map((r) => {
        const stop = stopMap.get(r.email)
        return {
          email: r.email,
          name: byEmail.get(r.email)?.name || '',
          status: stop ? 'stopped' : 'sent',
          reason: stop?.reason || '',
          sentDay: r.day || null,
          createdAt: byEmail.get(r.email)?.createdAt || r.createdAt || null,
          updatedAt: byEmail.get(r.email)?.updatedAt || null,
        }
      }),
    }
  }

  if (mode === 'unsent') {
    const match = searchClause(query) || {}
    const pipeline = [
      ...(Object.keys(match).length ? [{ $match: match }] : []),
      {
        $lookup: {
          from: ShalOutreachSent.collection.name,
          localField: 'email',
          foreignField: 'email',
          as: '_sent',
        },
      },
      {
        $lookup: {
          from: ShalOutreachStop.collection.name,
          localField: 'email',
          foreignField: 'email',
          as: '_stop',
        },
      },
      { $match: { '_sent.0': { $exists: false }, '_stop.0': { $exists: false } } },
      { $sort: { createdAt: 1 } },
      {
        $facet: {
          meta: [{ $count: 'total' }],
          rows: [{ $skip: skip }, { $limit: size }, { $project: { email: 1, name: 1, createdAt: 1, updatedAt: 1 } }],
        },
      },
    ]
    const [facet] = await ShalOutreachContact.aggregate(pipeline).allowDiskUse(true)
    const total = facet?.meta?.[0]?.total || 0
    const rows = facet?.rows || []
    return {
      total,
      page: pageNum,
      pageSize: size,
      filter: mode,
      q: query,
      contacts: rows.map((r) => ({
        email: r.email,
        name: r.name || '',
        status: 'unsent',
        reason: '',
        sentDay: null,
        createdAt: r.createdAt || null,
        updatedAt: r.updatedAt || null,
      })),
    }
  }

  // all
  const match = searchClause(query) || {}
  const [total, rows] = await Promise.all([
    ShalOutreachContact.countDocuments(match),
    ShalOutreachContact.find(match).sort({ createdAt: 1 }).skip(skip).limit(size).lean(),
  ])
  const { sentMap, stopMap } = await mapsForEmails(rows.map((r) => r.email))
  return {
    total,
    page: pageNum,
    pageSize: size,
    filter: mode,
    q: query,
    contacts: annotateContacts(rows, sentMap, stopMap),
  }
}

export async function addContact({ email, name = '' } = {}) {
  await connectDB()
  const e = normalizeEmail(email)
  if (!isValidEmail(e)) {
    throw Object.assign(new Error('Enter a valid email address.'), { status: 400 })
  }
  const existing = await ShalOutreachContact.findOne({ email: e }).lean()
  if (existing) {
    throw Object.assign(new Error('That email is already on the list.'), { status: 409 })
  }
  const doc = await ShalOutreachContact.create({ email: e, name: String(name || '').trim() })
  const { sentMap, stopMap } = await mapsForEmails([e])
  return annotateContacts([doc.toObject()], sentMap, stopMap)[0]
}

export async function updateContact({ email, name, newEmail } = {}) {
  await connectDB()
  const current = normalizeEmail(email)
  if (!current.includes('@')) {
    throw Object.assign(new Error('Missing contact email.'), { status: 400 })
  }
  const doc = await ShalOutreachContact.findOne({ email: current })
  if (!doc) {
    throw Object.assign(new Error('Contact not found.'), { status: 404 })
  }

  const nextEmail = newEmail != null ? normalizeEmail(newEmail) : current
  if (nextEmail !== current) {
    if (!isValidEmail(nextEmail)) {
      throw Object.assign(new Error('Enter a valid new email address.'), { status: 400 })
    }
    const clash = await ShalOutreachContact.findOne({ email: nextEmail }).lean()
    if (clash) {
      throw Object.assign(new Error('Another contact already uses that email.'), { status: 409 })
    }
    doc.email = nextEmail
    await Promise.all([
      ShalOutreachSent.updateMany({ email: current }, { $set: { email: nextEmail } }),
      ShalOutreachStop.updateMany({ email: current }, { $set: { email: nextEmail } }),
    ])
  }
  if (name != null) doc.name = String(name).trim()
  await doc.save()

  const { sentMap, stopMap } = await mapsForEmails([doc.email])
  return annotateContacts([doc.toObject()], sentMap, stopMap)[0]
}

export async function deleteContact(email) {
  await connectDB()
  const e = normalizeEmail(email)
  const result = await ShalOutreachContact.deleteOne({ email: e })
  if (!result.deletedCount) {
    throw Object.assign(new Error('Contact not found.'), { status: 404 })
  }
  // Keep sent/stop history so we don't accidentally re-mail bounced or opted-out addresses.
  return { deleted: true, email: e }
}

/** Put address back in the queue (does not remove unsubscribes). */
export async function clearContactSent(email) {
  await connectDB()
  const e = normalizeEmail(email)
  const result = await ShalOutreachSent.deleteOne({ email: e })
  return { cleared: result.deletedCount > 0, email: e }
}

/** Remove from stop list so outreach can mail again (blocked for bounce/complaint). */
export async function resubscribeContact(email) {
  await connectDB()
  const e = normalizeEmail(email)
  const stop = await ShalOutreachStop.findOne({ email: e }).lean()
  if (!stop) return { restored: false, email: e, reason: '' }
  if (stop.reason === 'bounced' || stop.reason === 'complained') {
    throw Object.assign(
      new Error(`Cannot resubscribe ${e} (${stop.reason}). Keep it off the list.`),
      { status: 400 }
    )
  }
  await ShalOutreachStop.deleteOne({ email: e })
  return { restored: true, email: e, reason: stop.reason || '' }
}

export async function getStatus() {
  await connectDB()
  const today = day()
  // Fast counts only — avoid $lookup over ~178k contacts (that made localhost feel stuck).
  // remaining ≈ contacts not yet mailed; stopped-but-never-sent is a small edge case.
  const [valid, sentTotal, unsubscribed, bounced, complained, usedToday, recentSent, recentUnsubscribed, recentEvents, recentRemoved] =
    await Promise.all([
      ShalOutreachContact.countDocuments(),
      ShalOutreachSent.countDocuments(),
      ShalOutreachStop.countDocuments(),
      ShalOutreachEvent.countDocuments({ type: 'bounced' }),
      ShalOutreachEvent.countDocuments({ type: 'complained' }),
      ShalOutreachSent.countDocuments({ day: today }),
      ShalOutreachSent.find({}).sort({ createdAt: -1 }).limit(50).lean(),
      ShalOutreachStop.find({}).sort({ createdAt: -1 }).limit(100).lean(),
      ShalOutreachEvent.find({}).sort({ createdAt: -1 }).limit(100).lean(),
      ShalOutreachRemoved.find({}).sort({ createdAt: -1 }).limit(100).lean(),
    ])

  const remaining = Math.max(0, valid - sentTotal)
  const cap = dailyCap()

  return {
    listMissing: valid === 0,
    valid,
    cleaned: 0,
    sentTotal,
    unsubscribed,
    bounced,
    complained,
    remaining,
    usedToday,
    cap,
    roomToday: Math.max(0, cap - usedToday),
    hasResendKey: Boolean(process.env.SHALCONNECTS_RESEND_API_KEY?.trim()),
    hasWebhookSecret: Boolean(process.env.SHALCONNECTS_RESEND_WEBHOOK_SECRET?.trim()),
    webhookUrl: `${siteOrigin()}/api/webhook/shal-resend`,
    from: process.env.SHALCONNECTS_FROM || 'ShalConnects <hello@shalconnects.com>',
    storage: 'mongodb',
    sendProgress: await getSendProgress(),
    recentSent: recentSent.map((r) => ({ email: r.email, day: r.day })),
    recentUnsubscribed: recentUnsubscribed.map((r) => ({ email: r.email, reason: r.reason })),
    recentEvents: recentEvents.map((r) => ({
      email: r.email,
      type: r.type,
      message: r.message || '',
      createdAt: r.createdAt,
    })),
    recentRemoved: recentRemoved.map((r) => ({
      email: r.email,
      reason: r.reason,
      day: r.day,
    })),
  }
}

export { day, parseList }
