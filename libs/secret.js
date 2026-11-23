import { createHash, timingSafeEqual } from 'crypto'
import { logError } from '@/libs/logger'
import { getSiteUrl } from '@/libs/site-url'

/** Constant-time string compare (hashing first makes lengths equal). */
export function safeEqual(a, b) {
  if (!a || !b) return false
  const digest = (v) => createHash('sha256').update(String(v)).digest()
  return timingSafeEqual(digest(a), digest(b))
}

/** `Authorization: Bearer <CRON_SECRET>` check shared by the cron routes. */
export function cronAuthorized(req) {
  const secret = (process.env.CRON_SECRET || '').trim()
  return safeEqual(req.headers.get('authorization'), secret && `Bearer ${secret}`)
}

/** Start another cron run (its own 300 s budget) without waiting for it. */
export function kickCron(query) {
  const secret = (process.env.CRON_SECRET || '').trim()
  if (!secret || process.env.JEST_WORKER_ID) return
  fetch(`${getSiteUrl()}/api/cron/social?${query}`, { headers: { authorization: `Bearer ${secret}` } }).catch(
    (error) => logError(`Cron kick (${query}) failed`, error)
  )
}
