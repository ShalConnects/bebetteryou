// API utility functions for Next.js App Router

import { NextResponse } from 'next/server'
import { logError } from './logger'

export const handleApiError = (error) => {
  logError('API Error', error, {
    errorName: error?.name,
    errorMessage: error?.message
  })
  
  if (error.name === 'ValidationError') {
    return NextResponse.json(
      {
        error: 'Validation Error',
        details: error.message
      },
      { status: 400 }
    )
  }
  
  if (error.name === 'CastError') {
    return NextResponse.json(
      {
        error: 'Invalid ID format'
      },
      { status: 400 }
    )
  }
  
  // A thrown error carrying a status is a deliberate refusal with a message
  // meant for the user, not a crash to be hidden behind a generic 500.
  if (Number.isInteger(error.status) && error.status >= 400 && error.status < 500) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }

  return NextResponse.json(
    {
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    },
    { status: 500 }
  )
}

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const validateRequired = (data, requiredFields) => {
  const missing = requiredFields.filter(field => !data[field])
  return {
    isValid: missing.length === 0,
    missing
  }
}

export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input
  return input.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
}

/**
 * Validate request body against required fields
 * Returns validation result with isValid flag and missing fields
 */
export const validateRequestBody = (body, requiredFields) => {
  const missing = requiredFields.filter(field => !body || body[field] === undefined || body[field] === null || body[field] === '')
  return {
    isValid: missing.length === 0,
    missing
  }
}
