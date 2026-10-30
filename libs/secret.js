import { createHash, timingSafeEqual } from 'crypto'

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
