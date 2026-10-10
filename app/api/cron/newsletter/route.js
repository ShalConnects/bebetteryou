import { NextResponse } from 'next/server'
import { runQuoteEmailCron } from '@/libs/newsletter-cron'
import { cleanupSuppressedNewsletterSubscribers } from '@/libs/newsletter-cleanup'
import { handleApiError } from '@/libs/api'
import { withApiLogging } from '@/libs/api-middleware'
import { logError, logInfo } from '@/libs/logger'

/** Vercel Cron — sync bounce suppressions, then email today's social quote (up to 100). */
export const maxDuration = 300

function authorized(req) {
  const secret = (process.env.CRON_SECRET || '').trim()
  if (!secret) return false
  const header = req.headers.get('authorization') || ''
  return header === `Bearer ${secret}`
}

async function handleGet(req) {
  try {
    if (!authorized(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let cleanup = null
    try {
      cleanup = await cleanupSuppressedNewsletterSubscribers()
      logInfo('Newsletter cron: suppression cleanup', cleanup)
    } catch (error) {
      logError('Newsletter cron: suppression cleanup failed', error)
      cleanup = { error: error.message || 'cleanup failed' }
    }

    const result = await runQuoteEmailCron()
    return NextResponse.json({ ok: true, cleanup, ...result })
  } catch (error) {
    logError('Quote email cron failed', error)
    const errorResponse = handleApiError(error)
    if (errorResponse) return errorResponse
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 })
  }
}

export const GET = withApiLogging(handleGet)
