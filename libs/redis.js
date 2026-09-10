import { createClient } from 'redis'
import { logError, logInfo } from './logger'

let redisClient = null
let isRedisAvailable = false

/**
 * Initialize Redis client
 * Returns true if Redis is available, false otherwise
 */
export async function initRedis() {
  const redisUrl = process.env.REDIS_URL || process.env.REDIS_HOST
  
  if (!redisUrl) {
    logInfo('Redis not configured, using in-memory rate limiting')
    return false
  }

  try {
    redisClient = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logError('Redis connection failed after retries', new Error('Max retries exceeded'))
            return false
          }
          return Math.min(retries * 100, 3000)
        }
      }
    })

    redisClient.on('error', (err) => {
      logError('Redis client error', err)
      isRedisAvailable = false
    })

    redisClient.on('connect', () => {
      logInfo('Redis client connected')
      isRedisAvailable = true
    })

    redisClient.on('ready', () => {
      logInfo('Redis client ready')
      isRedisAvailable = true
    })

    redisClient.on('reconnecting', () => {
      logInfo('Redis client reconnecting')
      isRedisAvailable = false
    })

    await redisClient.connect()
    isRedisAvailable = true
    return true
  } catch (error) {
    logError('Failed to initialize Redis', error)
    isRedisAvailable = false
    return false
  }
}

/**
 * Get Redis client instance
 */
export function getRedisClient() {
  return redisClient
}

/**
 * Check if Redis is available
 */
export function isRedisReady() {
  return isRedisAvailable && redisClient?.isReady
}

/**
 * Close Redis connection
 */
export async function closeRedis() {
  if (redisClient) {
    try {
      await redisClient.quit()
      isRedisAvailable = false
      logInfo('Redis connection closed')
    } catch (error) {
      logError('Error closing Redis connection', error)
    }
  }
}

// Initialize Redis on module load (server-side only)
if (typeof window === 'undefined') {
  initRedis().catch((error) => {
    logError('Redis initialization error', error)
  })
}

