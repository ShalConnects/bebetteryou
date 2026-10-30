import { NextResponse } from 'next/server'
import { handleApiError } from '@/libs/api'
import { withApiLogging } from '@/libs/api-middleware'
import { logError } from '@/libs/logger'
import { kickNewsletterSendQueue, processNewsletterSendQueue } from '@/libs/newsletter-send-job'

/** Continues an open quote, blog, or book send until the list is done. */
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

    const result = await processNewsletterSendQueue({ maxMs: 50000 })
    if (result.remaining && !result.error) kickNewsletterSendQueue()
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    logError('Newsletter send queue failed', error)
    const errorResponse = handleApiError(error)
    if (errorResponse) return errorResponse
    return NextResponse.json({ error: 'Send queue failed' }, { status: 500 })
  }
}

export const GET = withApiLogging(handleGet)
