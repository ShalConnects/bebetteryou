import { NextResponse } from 'next/server'
import { runDueSocialSchedules } from '@/libs/social/run-due-schedules'
import { runDailyYoutubeShort } from '@/libs/social/run-daily-youtube-short'
import { runNewsletterCronPipeline } from '@/libs/newsletter-cron'
import { kickNewsletterSendQueue, processNewsletterSendQueue } from '@/libs/newsletter-send-job'
import {
  kickShalOutreachCron,
  outreachCronEnabled,
  sendTodayBatch,
} from '@/libs/shal-outreach/run'
import { handleApiError } from '@/libs/api'
import { withApiLogging } from '@/libs/api-middleware'
import { logError } from '@/libs/logger'
import { cronAuthorized } from '@/libs/secret'

/**
 * Single daily Vercel Cron (Hobby: 1 job):
 * 1) due social → 2) quote email → 3) backlog YouTube Short
 * 4) optional ShalConnects outreach (SHALCONNECTS_OUTREACH_CRON=1) via kicked follow-up.
 * Also: `?emailOnly=1`, `?queue=1`, `?shalOutreach=1` / `?outreachOnly=1`.
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

    if (url.searchParams.get('shalOutreach') === '1' || url.searchParams.get('outreachOnly') === '1') {
      if (!outreachCronEnabled()) {
        return NextResponse.json({
          ok: true,
          skipped: true,
          reason: 'SHALCONNECTS_OUTREACH_CRON is off',
        })
      }
      try {
        const result = await sendTodayBatch()
        return NextResponse.json({
          ok: true,
          shalOutreach: {
            sent: result.sent,
            attempted: result.attempted,
            failures: result.failures,
            durationMs: result.durationMs,
          },
        })
      } catch (error) {
        logError('ShalConnects outreach cron failed', error)
        return NextResponse.json(
          {
            ok: false,
            shalOutreach: { error: error.message || 'Failed' },
          },
          { status: error.status === 409 ? 409 : 500 }
        )
      }
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

    // Separate invocation so 100 outreach sends get a fresh time budget.
    const outreachCron = outreachCronEnabled()
    if (outreachCron) kickShalOutreachCron()

    return NextResponse.json({
      ok: true,
      ...schedules,
      youtubeShort,
      newsletter,
      shalOutreachQueued: outreachCron,
    })
  } catch (error) {
    logError('Daily social cron failed', error)
    const errorResponse = handleApiError(error)
    if (errorResponse) return errorResponse
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 })
  }
}

export const GET = withApiLogging(handleGet)
