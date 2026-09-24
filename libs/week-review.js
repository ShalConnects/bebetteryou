import { getSiteUrl } from '@/libs/site-url'
import { shuffle } from '@/libs/sample'
import { listPostedQuoteSlugs } from '@/libs/social/post-store'

/** Collage networks for week-in-review (one JPG of all cards). */
export const WEEK_COLLAGE_NETWORKS = ['instagram', 'facebook', 'bluesky', 'telegram']

/**
 * Friday publish window: that Friday’s past Saturday 00:00 UTC → Thursday 23:59:59 UTC.
 * Mid-week preview anchors on the upcoming Friday so Sat–Thu includes the current week.
 */
export function fridayWeekRange(now = new Date()) {
  const day = now.getUTCDay() // 0 Sun … 5 Fri
  const daysUntilFriday = (5 - day + 7) % 7
  const friday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  friday.setUTCDate(friday.getUTCDate() + daysUntilFriday)

  const start = new Date(friday)
  start.setUTCDate(friday.getUTCDate() - 6) // Saturday
  start.setUTCHours(0, 0, 0, 0)

  const end = new Date(friday)
  end.setUTCDate(friday.getUTCDate() - 1) // Thursday
  end.setUTCHours(23, 59, 59, 999)

  return { start, end, friday, weekKey: start.toISOString().slice(0, 10) }
}

function seedFromKey(key) {
  let h = 2166136261
  for (const ch of String(key || '')) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return h >>> 0
}

/**
 * Week-in-review set: quotes successfully posted to social in Sat–Thu.
 * If none in-window, use all successfully posted quotes (e.g. the first 6 you shipped).
 * Empty social log → no cards (do not invent from catalog).
 */
export async function pickWeekReviewQuotes(quotes, range = fridayWeekRange()) {
  const list = Array.isArray(quotes) ? quotes : []
  const bySlug = new Map(list.filter((q) => q?.slug && q?.src).map((q) => [q.slug, q]))
  const seed = seedFromKey(range.weekKey)

  const inWindow = await listPostedQuoteSlugs({ since: range.start, until: range.end })
  let mode = 'posted'
  let rows = inWindow

  if (!rows.length) {
    rows = await listPostedQuoteSlugs()
    mode = 'posted-all'
  }

  const picked = rows.map((row) => bySlug.get(row.slug)).filter(Boolean)
  return { quotes: shuffle(picked, seed), mode }
}

/** @deprecated sync helper kept for unit tests of shuffle/window math */
export function pickFridayWeekQuotes(quotes, range = fridayWeekRange(), { fallbackLimit = 6 } = {}) {
  const list = (Array.isArray(quotes) ? quotes : []).filter((q) => q?.src)
  const start = range.start.getTime()
  const end = range.end.getTime()
  const seed = seedFromKey(range.weekKey)

  const inWeek = list.filter((q) => {
    if (!q.createdAt) return false
    const t = new Date(q.createdAt).getTime()
    return Number.isFinite(t) && t >= start && t <= end
  })
  if (inWeek.length) return { quotes: shuffle(inWeek, seed), mode: 'dated' }

  const newest = [...list].sort((a, b) => (b.n || 0) - (a.n || 0)).slice(0, fallbackLimit)
  return { quotes: shuffle(newest, seed), mode: 'recent' }
}

export function weekCaption(quotes, range) {
  const from = range.start.toISOString().slice(0, 10)
  const to = range.end.toISOString().slice(0, 10)
  const nums = quotes.map((q) => `#${q.n}`).join(' · ')
  return `Week in review (${from} → ${to})\n\n${nums}\n\n${getSiteUrl()}/quotes`
}

export function publicRange(range) {
  return {
    weekKey: range.weekKey,
    start: range.start.toISOString(),
    end: range.end.toISOString(),
    friday: range.friday.toISOString(),
  }
}
