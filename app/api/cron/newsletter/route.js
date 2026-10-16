import { NextResponse } from 'next/server'
import { runQuoteEmailCron } from '@/libs/newsletter-cron'
import { cleanupSuppressedNewsletterSubscribers } from '@/libs/newsletter-cleanup'
import { handleApiError } from '@/libs/api'
import { withApiLogging } from '@/libs/api-middleware'
import { logError, logInfo } from '@/libs/logger'

/** Vercel Cron — sync bounces, email today's quote, sync again for same-send bounces. */
export const maxDuration = 300

function authorized(req) {
  const secret = (process.env.CRON_SECRET || '').trim()
  if (!secret) return false
  const header = req.headers.get('authorization') || ''
  return header === `Bearer ${secret}`
}

async function runCleanup(label) {
  try {
    const cleanup = await cleanupSuppressedNewsletterSubscribers()
    logInfo(`Newsletter cron: ${label}`, cleanup)
    return cleanup
  } catch (error) {
    logError(`Newsletter cron: ${label} failed`, error)
    return { error: error.message || 'cleanup failed' }
  }
}

async function handleGet(req) {
  try {
    if (!authorized(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Before: catch anything since yesterday. After: catch bounces from this send.
    const cleanupBefore = await runCleanup('suppression cleanup (before send)')
    const result = await runQuoteEmailCron()
    const cleanupAfter = await runCleanup('suppression cleanup (after send)')

    return NextResponse.json({
      ok: true,
      cleanupBefore,
      cleanupAfter,
      ...result,
    })
  } catch (error) {
    logError('Quote email cron failed', error)
    const errorResponse = handleApiError(error)
    if (errorResponse) return errorResponse
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 })
  }
}

export const GET = withApiLogging(handleGet)
