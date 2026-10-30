import { NextResponse } from 'next/server'
import { isRedisReady, getRedisClient } from './redis'
import { logError } from './logger'

/** Sliding-window limiter: Redis when available (multi-instance), memory otherwise. */
const requestStore = new Map()

export function clientIp(request) {
  const h = request.headers
  const get = (k) => (typeof h?.get === 'function' ? h.get(k) : h?.[k])
  return get('x-forwarded-for')?.split(',')[0].trim() || get('x-real-ip') || 'unknown'
}

async function redisHit(key, limit, windowMs, now) {
  const redis = getRedisClient()
  if (!redis || !isRedisReady()) return undefined
  try {
    const rkey = `rate_limit:${key}`
    await redis.zRemRangeByScore(rkey, 0, now - windowMs)
    const [oldest] = await redis.zRangeWithScores(rkey, 0, 0)
    if ((await redis.zCard(rkey)) >= limit) return oldest?.score ?? now
    // Unique member: two requests in the same millisecond must both count.
    await redis.zAdd(rkey, { score: now, value: `${now}-${Math.random()}` })
    await redis.expire(rkey, Math.ceil(windowMs / 1000))
    return null
  } catch (error) {
    logError('Redis rate limit error', error)
    return undefined
  }
}

function memoryHit(key, limit, windowMs, now) {
  const hits = (requestStore.get(key) || []).filter((t) => t > now - windowMs)
  if (Math.random() < 0.01) {
    for (const [k, v] of requestStore) if (!v.some((t) => t > now - windowMs)) requestStore.delete(k)
  }
  const over = hits.length >= limit
  requestStore.set(key, over ? hits : [...hits, now])
  return over ? hits[0] : null
}

/** Records one hit for `key`; returns seconds until retry when over the limit, else 0. */
export async function hit(key, limit, windowMs) {
  const now = Date.now()
  const redis = await redisHit(key, limit, windowMs, now)
  const oldest = redis === undefined ? memoryHit(key, limit, windowMs, now) : redis
  return oldest == null ? 0 : Math.max(1, Math.ceil((oldest + windowMs - now) / 1000))
}

/**
 * Route limiter keyed by IP + path, so one chatty endpoint (analytics) can't use up
 * the allowance of a strict one (sign-in, checkout). Returns a 429 response or null.
 */
export async function rateLimit(request, limit = 100, windowMs = 15 * 60 * 1000) {
  const path = new URL(request.url).pathname
  const retryAfter = await hit(`${clientIp(request)}:${path}`, limit, windowMs)
  if (!retryAfter) return null
  return NextResponse.json(
    { error: 'Too Many Requests', message: 'Too many requests. Please try again later.', retryAfter },
    { status: 429, headers: { 'Retry-After': String(retryAfter), 'X-RateLimit-Limit': String(limit) } }
  )
}

/** Presets: requests per 15 minutes. */
const quarterHour = 15 * 60 * 1000
export const rateLimitPresets = {
  strict: { limit: 10, windowMs: quarterHour },
  moderate: { limit: 50, windowMs: quarterHour },
  standard: { limit: 100, windowMs: quarterHour },
  lenient: { limit: 200, windowMs: quarterHour },
  // One beacon per page view adds up fast, and offices share an IP — this only stops a flood.
  analytics: { limit: 600, windowMs: quarterHour },
}
