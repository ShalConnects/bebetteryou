import { NextResponse } from 'next/server'
import { runNewsletterCronPipeline } from '@/libs/newsletter-cron'
import { kickNewsletterSendQueue, processNewsletterSendQueue } from '@/libs/newsletter-send-job'
import { handleApiError } from '@/libs/api'
import { withApiLogging } from '@/libs/api-middleware'
import { logError } from '@/libs/logger'
import { cronAuthorized } from '@/libs/secret'

/**
 * Manual / legacy trigger for the email pipeline (`?queue=1` continues a long send).
 * Production schedule lives on /api/cron/social (14:00 UTC).
 */
export const maxDuration = 300

async function handleGet(req) {
  try {
    if (!cronAuthorized(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const queue = new URL(req.url).searchParams.get('queue') === '1'
    if (queue) {
      const result = await processNewsletterSendQueue({ maxMs: 50000 })
      if (result.remaining && !result.error) kickNewsletterSendQueue()
      return NextResponse.json({ ok: true, ...result })
    }

    const result = await runNewsletterCronPipeline()
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    logError(queueLabel(req), error)
    const errorResponse = handleApiError(error)
    if (errorResponse) return errorResponse
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 })
  }
}

function queueLabel(req) {
  try {
    return new URL(req.url).searchParams.get('queue') === '1'
      ? 'Newsletter send queue failed'
      : 'Quote email cron failed'
  } catch {
    return 'Quote email cron failed'
  }
}

export const GET = withApiLogging(handleGet)
