import { NextResponse } from 'next/server'
import { runQuoteEmailCron } from '@/libs/newsletter-cron'
import { handleApiError } from '@/libs/api'
import { withApiLogging } from '@/libs/api-middleware'
import { logError } from '@/libs/logger'

/** Vercel Cron — email latest public quote to up to 100 eligible subscribers. */
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
    const result = await runQuoteEmailCron()
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    logError('Quote email cron failed', error)
    const errorResponse = handleApiError(error)
    if (errorResponse) return errorResponse
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 })
  }
}

export const GET = withApiLogging(handleGet)
