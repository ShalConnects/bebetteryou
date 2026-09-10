/**
 * Simple logging utility
 * Integrates with Sentry for error tracking in production
 */

// Import Sentry if available (client-side only)
let Sentry = null
if (typeof window !== 'undefined') {
  try {
    Sentry = require('@sentry/nextjs')
  } catch (e) {
    // Sentry not available
  }
}

const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
}

/**
 * Format log message with timestamp and context
 */
function formatLog(level, message, context = {}) {
  const timestamp = new Date().toISOString()
  const logEntry = {
    timestamp,
    level,
    message,
    ...context
  }
  
  return JSON.stringify(logEntry)
}

/**
 * Log error with context
 */
export function logError(message, error, context = {}) {
  const errorContext = {
    ...context,
    error: {
      name: error?.name,
      message: error?.message,
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    }
  }
  
  console.error(formatLog(LOG_LEVELS.ERROR, message, errorContext))
  
  // Send to Sentry if available
  if (typeof window !== 'undefined' && Sentry && error) {
    Sentry.captureException(error, {
      tags: context,
      extra: errorContext
    })
  }
}

/**
 * Log warning with context
 */
export function logWarn(message, context = {}) {
  console.warn(formatLog(LOG_LEVELS.WARN, message, context))
}

/**
 * Log info with context
 */
export function logInfo(message, context = {}) {
  if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_INFO_LOGS === 'true') {
    console.log(formatLog(LOG_LEVELS.INFO, message, context))
  }
}

/**
 * Log debug information (only in development)
 */
export function logDebug(message, context = {}) {
  if (process.env.NODE_ENV === 'development') {
    console.debug(formatLog(LOG_LEVELS.DEBUG, message, context))
  }
}

/**
 * Log API request
 */
export function logApiRequest(method, path, statusCode, duration, context = {}) {
  const logContext = {
    method,
    path,
    statusCode,
    duration: `${duration}ms`,
    ...context
  }
  
  if (statusCode >= 500) {
    logError('API Request Error', null, logContext)
  } else if (statusCode >= 400) {
    logWarn('API Request Warning', logContext)
  } else {
    logInfo('API Request', logContext)
  }
}

