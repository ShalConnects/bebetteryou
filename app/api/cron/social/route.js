import { NextResponse } from 'next/server'
import { runDueSocialSchedules } from '@/libs/social/run-due-schedules'
import { runDailyYoutubeShort } from '@/libs/social/run-daily-youtube-short'
import { runNewsletterCronPipeline } from '@/libs/newsletter-cron'
import { kickNewsletterSendQueue, processNewsletterSendQueue } from '@/libs/newsletter-send-job'
import { handleApiError } from '@/libs/api'
import { withApiLogging } from '@/libs/api-middleware'
import { logError } from '@/libs/logger'
import { cronAuthorized } from '@/libs/secret'

/**
 * Single daily Vercel Cron (Hobby: 1 job):
 * 1) due social → 2) quote email → 3) backlog YouTube Short.
 * Also: `?emailOnly=1` (manual email), `?queue=1` (continue long newsletter send).
 */
export const maxDuration = 300

async function handleGet(req) {
  try {
    if (!cronAuthorized(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(req.url)
    if (url.searchParams.get('queue') === '1') {
      const result = await processNewsletterSendQueue({ maxMs: 50000 })
      if (result.remaining && !result.error) kickNewsletterSendQueue()
      return NextResponse.json({ ok: true, ...result })
    }

    if (url.searchParams.get('emailOnly') === '1') {
      const result = await runNewsletterCronPipeline()
      return NextResponse.json({ ok: true, ...result })
    }

    const schedules = await runDueSocialSchedules()

    let newsletter = null
    try {
      newsletter = await runNewsletterCronPipeline()
    } catch (error) {
      logError('Newsletter (after social cron) failed', error)
      newsletter = { ok: false, error: error.message || 'Failed' }
    }

    let youtubeShort = null
    try {
      youtubeShort = await runDailyYoutubeShort()
    } catch (error) {
      logError('Daily YouTube Short (after social cron) failed', error)
      youtubeShort = { ok: false, error: error.message || 'Failed' }
    }

    return NextResponse.json({ ok: true, ...schedules, youtubeShort, newsletter })
  } catch (error) {
    logError('Daily social cron failed', error)
    const errorResponse = handleApiError(error)
    if (errorResponse) return errorResponse
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 })
  }
}

export const GET = withApiLogging(handleGet)
