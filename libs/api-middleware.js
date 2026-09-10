import { NextResponse } from 'next/server'
import { logApiRequest } from './logger'

/**
 * API middleware for logging requests and responses
 * Wraps API route handlers to add logging
 */

/**
 * Wrap an API route handler with request/response logging
 * @param {Function} handler - The API route handler function
 * @param {Object} options - Middleware options
 * @returns {Function} - Wrapped handler with logging
 */
export function withLogging(handler, options = {}) {
  const { logRequestBody = false, logResponseBody = false } = options

  return async (request, context) => {
    const startTime = Date.now()
    const method = request.method
    const url = new URL(request.url)
    const path = url.pathname

    // Log request
    const requestBody = logRequestBody ? await cloneRequestBody(request) : null
    const requestHeaders = getSafeHeaders(request.headers)

    try {
      // Execute the handler
      const response = await handler(request, context)
      const duration = Date.now() - startTime

      // Get response status
      const statusCode = response?.status || 200

      // Log response
      const responseBody = logResponseBody && response ? await cloneResponseBody(response) : null

      logApiRequest(method, path, statusCode, duration, {
        requestBody: requestBody,
        responseBody: responseBody,
        headers: requestHeaders
      })

      return response
    } catch (error) {
      const duration = Date.now() - startTime
      logApiRequest(method, path, 500, duration, {
        error: error.message,
        requestBody: requestBody,
        headers: requestHeaders
      })
      throw error
    }
  }
}

/**
 * Clone request body for logging (without consuming the stream)
 */
async function cloneRequestBody(request) {
  try {
    const clonedRequest = request.clone()
    const body = await clonedRequest.json()
    return sanitizeForLogging(body)
  } catch (error) {
    return null
  }
}

/**
 * Clone response body for logging
 */
async function cloneResponseBody(response) {
  try {
    const clonedResponse = response.clone()
    const body = await clonedResponse.json()
    return sanitizeForLogging(body)
  } catch (error) {
    return null
  }
}

/**
 * Get safe headers (exclude sensitive information)
 */
function getSafeHeaders(headers) {
  const safeHeaders = {}
  const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token']
  
  headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase()
    if (!sensitiveHeaders.includes(lowerKey)) {
      safeHeaders[key] = value
    } else {
      safeHeaders[key] = '[REDACTED]'
    }
  })
  
  return safeHeaders
}

/**
 * Sanitize data for logging (remove sensitive fields)
 */
function sanitizeForLogging(data) {
  if (!data || typeof data !== 'object') {
    return data
  }

  const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'authorization']
  const sanitized = Array.isArray(data) ? [...data] : { ...data }

  for (const key in sanitized) {
    const lowerKey = key.toLowerCase()
    if (sensitiveFields.some(field => lowerKey.includes(field))) {
      sanitized[key] = '[REDACTED]'
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeForLogging(sanitized[key])
    }
  }

  return sanitized
}

/**
 * Create a middleware that can be used in API routes
 * Usage: export const POST = withApiLogging(async (request) => { ... })
 */
export function withApiLogging(handler, options = {}) {
  return withLogging(handler, options)
}

