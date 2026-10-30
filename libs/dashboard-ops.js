/** Shared schedule/ops helpers for admin dashboard (pure). */
import { nextPostDate, slotOnDate } from '@/libs/social/post-slot'

/** Failures still open — hide networks that later succeeded for this slug (post log). */
export function failedResults(row, postsBySlug) {
  const fails = (row?.results || []).filter((r) => r && r.ok === false)
  if (!postsBySlug) return fails
  const posts = postsBySlug[row.slug] || {}
  return fails.filter((r) => !posts[r.id]?.ok)
}

export function isScheduleFailure(row, postsBySlug) {
  if (!row) return false
  if (failedResults(row, postsBySlug).length > 0) return true
  if (row.status !== 'failed') return false
  const nets = row.networks || []
  if (!postsBySlug || !nets.length) return true
  const posts = postsBySlug[row.slug] || {}
  return nets.some((id) => !posts[id]?.ok)
}

export function scheduleFailures(rows, { days = 21, postsBySlug } = {}) {
  const since = Date.now() - days * 86_400_000
  return (rows || []).filter((r) => {
    if (!isScheduleFailure(r, postsBySlug)) return false
    if (!r.runAt) return true
    return new Date(r.runAt).getTime() >= since
  })
}

export function upcomingPending(rows, limit = 3) {
  return (rows || [])
    .filter((r) => r.status === 'pending')
    .sort((a, b) => new Date(a.runAt) - new Date(b.runAt))
    .slice(0, limit)
}

/** Latest cron result per network from schedule rows. */
export function networkLastActivity(rows) {
  const map = {}
  for (const row of rows || []) {
    const at = row.runAt || row.updatedAt || row.createdAt
    if (!at) continue
    for (const r of row.results || []) {
      if (!r?.id) continue
      const prev = map[r.id]
      if (prev && new Date(prev.at) >= new Date(at)) continue
      map[r.id] = {
        ok: Boolean(r.ok),
        at,
        error: r.error || '',
        slug: row.slug,
      }
    }
  }
  return map
}

/** Admin-local time (Bangladesh) — `dateStyle` can't be mixed with `weekday`, so spell the parts out. */
const ADMIN_TZ = 'Asia/Dhaka'
const dayKeyFmt = new Intl.DateTimeFormat('en-CA', { timeZone: ADMIN_TZ })
const dayLabelFmt = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', timeZone: 'UTC' })

/** Bangladesh calendar day of an instant, as "YYYY-MM-DD". */
export const adminDay = (value) => dayKeyFmt.format(new Date(value))

/** `count` consecutive admin days starting today: [{ key, label }]. */
export function adminDays(count, now = Date.now()) {
  const start = Date.parse(`${adminDay(now)}T00:00:00Z`)
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(start + i * 86_400_000)
    return { key: date.toISOString().slice(0, 10), label: dayLabelFmt.format(date) }
  })
}

/** Badge [variant, label] per slot status — shared by the calendar and the queue. */
export const slotBadges = {
  scheduled: ['default', 'Scheduled'],
  posted: ['muted', 'Posted'],
  partial: ['warn', 'Partly failed'],
  overdue: ['danger', 'Overdue'],
  failed: ['danger', 'Failed'],
  canceled: ['muted', 'Canceled'],
  running: ['warn', 'Posting'],
}

/** Per-network outcome for one row: `ok` (cron or a later post), `failed`, or `waiting`. */
export function networkStates(row, postsBySlug = {}) {
  const posted = postsBySlug[row.slug] || {}
  const results = Object.fromEntries((row.results || []).map((r) => [r.id, r]))
  return (row.networks || []).map((id) => {
    const r = results[id]
    const state = posted[id]?.ok || r?.ok ? 'ok' : r?.ok === false ? 'failed' : 'waiting'
    return { id, state, error: state === 'failed' ? r.error || 'Failed' : '' }
  })
}

/** Vercel fires the 14:00 UTC cron somewhere inside that hour. */
const CRON_GRACE_MS = 3_600_000

/** Calendar status for one schedule row (pending past the cron hour = missed its run). */
export function slotStatus(row, now = Date.now(), postsBySlug) {
  if (row.status === 'pending') return Date.parse(row.runAt) < now - CRON_GRACE_MS ? 'overdue' : 'scheduled'
  if (row.status === 'done') return failedResults(row, postsBySlug).length ? 'partial' : 'posted'
  return row.status
}

/** Admin day of the next cron run — where an overdue post will actually go out. */
export const nextRunDay = (now = Date.now()) => adminDay(slotOnDate(nextPostDate(new Date(now))))

/** Admin day a schedule row lands on — overdue rows go out with the next run. */
export const slotDay = (row, now = Date.now(), postsBySlug) =>
  slotStatus(row, now, postsBySlug) === 'overdue' ? nextRunDay(now) : adminDay(row.runAt)

/** How many of the next `days` admin days have at least one pending post. */
export function coveredDays(rows, days, now = Date.now()) {
  const week = new Set(adminDays(days, now).map((d) => d.key))
  return new Set(rows.filter((r) => r.status === 'pending').map((r) => slotDay(r, now)).filter((d) => week.has(d))).size
}

const when = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: ADMIN_TZ,
})

/** Assembled from parts: Node and browsers punctuate `en-GB` differently, which breaks hydration. */
export function formatScheduleWhen(iso) {
  const d = iso ? new Date(iso) : null
  if (!d || Number.isNaN(d.getTime())) return '—'
  const p = Object.fromEntries(when.formatToParts(d).map(({ type, value }) => [type, value]))
  return `${p.weekday} ${p.day} ${p.month}, ${p.hour}:${p.minute} ${p.dayPeriod.toLowerCase()}`
}

/** Deep-link into Manage quotes (cards + optional retry networks). */
export function manageQuotesHref({ quote, retry, section, date, tag } = {}) {
  const q = new URLSearchParams()
  if (date) q.set('date', date)
  if (tag) q.set('tag', tag)
  if (quote) q.set('quote', quote)
  if (retry) q.set('retry', Array.isArray(retry) ? retry.filter(Boolean).join(',') : String(retry))
  if (section) q.set('section', section)
  const s = q.toString()
  return s ? `/dashboard/quotes?${s}` : '/dashboard/quotes'
}
