import { ray } from '@/config/ray'
import { readQuotes } from '@/libs/quotes-store'
import { utcDateInput } from '@/libs/social/post-slot'
import { listAllSchedules } from '@/libs/social/schedule-store'
import { readRays, seedScripts } from './store'

export const HOUR = 3_600_000
const WEEK = 7 * 24 * HOUR
/** Sent to Higgsfield: from here on the card's own YouTube Short steps aside. */
export const SENT = ['generating', 'ready', 'posted']

export const rayKey = (slug) => `ray-${slug}`
export const isRayDay = (at) => ray.weekdays.includes(new Date(at).getUTCDay())
export const videoCost = () => Math.round(ray.seconds * ray.usdPerSecond * 100) / 100

/** Spend on videos sent in the last 7 days. */
export const weekSpend = (rows, now = new Date()) =>
  Object.values(rows)
    .filter((r) => r.submittedAt && now - new Date(r.submittedAt) < WEEK)
    .reduce((sum, r) => sum + (r.costUsd || 0), 0)

/** Stable backdrop per quote. */
export function raySetting(slug) {
  let h = 0
  for (const c of String(slug)) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return ray.settings[h % ray.settings.length]
}

/** A Ray video is on its way for this card, so its image Short should not also go to YouTube. */
export async function rayComing(slug) {
  return SENT.includes((await readRays({ slug }))[slug]?.status)
}

/** A Ray video belongs to today's slot — the daily backlog Short skips the day. */
export async function rayDueToday(now = new Date()) {
  const today = utcDateInput(now)
  return Object.values(await readRays()).some((r) => SENT.includes(r.status) && r.postAt && utcDateInput(new Date(r.postAt)) === today)
}

/** Dashboard list: Ray-day cards in the next 14 days, plus the last 14 days' videos. */
export async function rayBoard(now = new Date()) {
  const [schedules, rows, quotes] = await Promise.all([listAllSchedules(), readRays(), readQuotes()])
  const seeds = seedScripts()
  const bySlug = Object.fromEntries(quotes.map((q) => [q.slug, q]))
  const upcoming = schedules.filter(
    (s) => s.status === 'pending' && isRayDay(s.runAt) && new Date(s.runAt) - now < 14 * 24 * HOUR
  )
  const slots = new Map(upcoming.map((s) => [s.slug, s.runAt]))
  for (const r of Object.values(rows)) {
    if (r.postAt && now - new Date(r.postAt) < 14 * 24 * HOUR && r.status !== 'draft') slots.set(r.slug, r.postAt)
  }
  const items = [...slots].map(([slug, postAt]) => {
    const row = rows[slug] || {}
    const seed = seeds[slug] || {}
    return {
      slug,
      n: bySlug[slug]?.n,
      text: bySlug[slug]?.text || '',
      postAt: new Date(postAt).toISOString(),
      hook: row.hook || seed.hook || '',
      script: row.script || seed.script || '',
      status: row.status || 'draft',
      videoUrl: row.videoUrl || '',
      results: row.results || [],
      error: row.error || '',
    }
  })
  items.sort((a, b) => new Date(a.postAt) - new Date(b.postAt))
  return { items, spend: weekSpend(rows, now), cap: ray.weeklyCapUsd, cost: videoCost() }
}
