import { NextResponse } from 'next/server'
import { isRedisReady, getRedisClient } from './redis'
import { logError } from './logger'

/**
 * Rate limiter for Next.js App Router
 * Supports both Redis (for multi-instance) and in-memory (fallback)
 */

// Store requests in memory (cleared on server restart) - fallback
const requestStore = new Map()

/**
 * Clean up old entries periodically
 */
function cleanupOldEntries(windowMs) {
  const now = Date.now()
  const cutoff = now - windowMs
  
  for (const [key, requests] of requestStore.entries()) {
    const validRequests = requests.filter(time => time > cutoff)
    if (validRequests.length === 0) {
      requestStore.delete(key)
    } else {
      requestStore.set(key, validRequests)
    }
  }
}

/**
 * Get client identifier from request
 */
function getClientId(request) {
  // Try to get IP from various headers (for proxies/load balancers)
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const remoteAddr = request.headers.get('remote-addr')
  
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(',')[0].trim()
  }
  
  if (realIp) {
    return realIp
  }
  
  if (remoteAddr) {
    return remoteAddr
  }
  
  // Fallback to a default identifier (not ideal, but better than nothing)
  return 'unknown'
}

/**
 * Rate limiting with Redis (for multi-instance deployments)
 */
async function rateLimitWithRedis(clientId, limit, windowMs) {
  try {
    const redis = getRedisClient()
    if (!redis || !isRedisReady()) {
      return null // Fallback to in-memory
    }

    const key = `rate_limit:${clientId}`
    const now = Date.now()
    const windowStart = now - windowMs

    // Get current count (requests within the time window)
    const count = await redis.zCount(key, windowStart, '+inf')

    if (count >= limit) {
      // Get the oldest request time to calculate retry-after
      const oldest = await redis.zRange(key, 0, 0, { REV: false })
      const oldestTime = oldest.length > 0 ? parseInt(oldest[0]) : now
      const retryAfter = Math.ceil((oldestTime + windowMs - now) / 1000)

      return NextResponse.json(
        {
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Maximum ${limit} requests per ${Math.round(windowMs / 1000 / 60)} minutes.`,
          retryAfter
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil((oldestTime + windowMs) / 1000))
          }
        }
      )
    }

    // Add current request
    await redis.zAdd(key, { score: now, value: String(now) })
    // Set expiration on the key
    await redis.expire(key, Math.ceil(windowMs / 1000))

    const remaining = limit - count - 1
    return { remaining, reset: Math.ceil((now + windowMs) / 1000) }
  } catch (error) {
    logError('Redis rate limit error', error)
    return null // Fallback to in-memory on error
  }
}

/**
 * Rate limiting middleware for Next.js App Router
 * @param {number} limit - Maximum number of requests
 * @param {number} windowMs - Time window in milliseconds (default: 15 minutes)
 * @returns {Promise<NextResponse|null>} - Returns NextResponse if rate limited, null if allowed
 */
export async function rateLimit(request, limit = 100, windowMs = 15 * 60 * 1000) {
  const clientId = getClientId(request)
  const now = Date.now()
  const windowStart = now - windowMs

  // Try Redis first (for multi-instance deployments)
  if (isRedisReady()) {
    const redisResult = await rateLimitWithRedis(clientId, limit, windowMs)
    if (redisResult instanceof NextResponse) {
      return redisResult
    }
    if (redisResult) {
      // Request allowed via Redis
      return null
    }
    // Fall through to in-memory if Redis failed
  }

  // Fallback to in-memory rate limiting
  if (!requestStore.has(clientId)) {
    requestStore.set(clientId, [])
  }

  const requests = requestStore.get(clientId)
  const validRequests = requests.filter(time => time > windowStart)

  if (validRequests.length >= limit) {
    if (Math.random() < 0.01) {
      cleanupOldEntries(windowMs)
    }

    return NextResponse.json(
      {
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Maximum ${limit} requests per ${Math.round(windowMs / 1000 / 60)} minutes.`,
        retryAfter: Math.ceil((validRequests[0] + windowMs - now) / 1000)
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((validRequests[0] + windowMs - now) / 1000)),
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil((validRequests[0] + windowMs) / 1000))
        }
      }
    )
  }

  validRequests.push(now)
  requestStore.set(clientId, validRequests)

  if (Math.random() < 0.01) {
    cleanupOldEntries(windowMs)
  }

  return null // Request allowed
}

/**
 * Rate limit configuration presets
 */
export const rateLimitPresets = {
  // Strict: 10 requests per 15 minutes
  strict: { limit: 10, windowMs: 15 * 60 * 1000 },
  // Moderate: 50 requests per 15 minutes
  moderate: { limit: 50, windowMs: 15 * 60 * 1000 },
  // Standard: 100 requests per 15 minutes
  standard: { limit: 100, windowMs: 15 * 60 * 1000 },
  // Lenient: 200 requests per 15 minutes
  lenient: { limit: 200, windowMs: 15 * 60 * 1000 },
  // Analytics: one beacon per page view adds up fast, and offices and phone
  // networks share an IP — this only needs to stop a flood, not police browsing.
  analytics: { limit: 600, windowMs: 15 * 60 * 1000 },
}

