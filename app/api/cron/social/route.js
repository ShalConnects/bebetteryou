import { NextResponse } from 'next/server'
import { runDueSocialSchedules } from '@/libs/social/run-due-schedules'
import { runDailyYoutubeShort } from '@/libs/social/run-daily-youtube-short'
import { renewThreadsToken } from '@/libs/social/providers/threads'
import { runNewsletterCronPipeline } from '@/libs/newsletter-cron'
import { kickNewsletterSendQueue, processNewsletterSendQueue } from '@/libs/newsletter-send-job'
import {
  kickShalOutreachCron,
  outreachCronEnabled,
  sendCronBatch,
} from '@/libs/shal-outreach/run'
import { handleApiError } from '@/libs/api'
import { withApiLogging } from '@/libs/api-middleware'
import { logError } from '@/libs/logger'
import { cronAuthorized, kickCron } from '@/libs/secret'
import { weekReviewWeekday } from '@/config/social'
import { publishWeekReviewOnce } from '@/libs/week-review-publish'

/**
 * Single daily Vercel Cron (Hobby: 1 job):
 * 0) weekly Threads token renewal → 1) due social → 2) quote email → 3) backlog YouTube Short
 * 4) Fridays: week in review, as its own run (Threads thread + Short need the time)
 * 5) optional ShalConnects outreach (SHALCONNECTS_OUTREACH_CRON=1) via kicked follow-up.
 * Also: `?emailOnly=1`, `?queue=1`, `?shalOutreach=1` / `?outreachOnly=1`.
 */
export const maxDuration = 300

/** One cron step: its failure is logged and reported, never stops the steps after it. */
async function step(label, run) {
  try {
    return await run()
  } catch (error) {
    logError(`${label} (social cron) failed`, error)
    return { ok: false, error: error.message || 'Failed' }
  }
}

async function handleGet(req) {
  try {
    if (!cronAuthorized(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(req.url)
    if (url.searchParams.get('queue') === '1') {
      const result = await processNewsletterSendQueue({ maxMs: 50000 })
      if (result.remaining && !result.error) await kickNewsletterSendQueue()
      return NextResponse.json({ ok: true, ...result })
    }

    if (url.searchParams.get('weekReview') === '1') {
      return NextResponse.json({ ok: true, weekReview: await step('Week review', publishWeekReviewOnce) })
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
        const result = await sendCronBatch()
        return NextResponse.json({
          ok: true,
          shalOutreach: {
            sent: result.sent,
            attempted: result.attempted,
            failures: result.failures,
            durationMs: result.durationMs,
            paused: Boolean(result.paused),
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

    // Kicked first, so the request is out long before this run returns.
    const weekReviewQueued = new Date().getUTCDay() === weekReviewWeekday
    if (weekReviewQueued) await kickCron('weekReview=1')

    const threadsToken = await step('Threads token renewal', renewThreadsToken)
    const schedules = await runDueSocialSchedules()
    const newsletter = await step('Newsletter', runNewsletterCronPipeline)
    const youtubeShort = await step('Daily YouTube Short', runDailyYoutubeShort)

    // Separate invocation so 100 outreach sends get a fresh time budget.
    const outreachCron = outreachCronEnabled()
    if (outreachCron) await kickShalOutreachCron()

    return NextResponse.json({
      ok: true,
      ...schedules,
      youtubeShort,
      newsletter,
      threadsToken,
      weekReviewQueued,
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
