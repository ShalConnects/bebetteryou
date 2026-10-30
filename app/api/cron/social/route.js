import { NextResponse } from 'next/server'
import { runDueSocialSchedules } from '@/libs/social/run-due-schedules'
import { runDailyYoutubeShort } from '@/libs/social/run-daily-youtube-short'
import { runNewsletterCronPipeline } from '@/libs/newsletter-cron'
import { handleApiError } from '@/libs/api'
import { withApiLogging } from '@/libs/api-middleware'
import { logError } from '@/libs/logger'
import { cronAuthorized } from '@/libs/secret'

/**
 * Single daily Vercel Cron (Hobby: 1 job):
 * 1) due social schedules → 2) backlog YouTube Short → 3) quote email.
 * Protect with CRON_SECRET.
 */
export const maxDuration = 300


async function handleGet(req) {
  try {
    if (!cronAuthorized(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const schedules = await runDueSocialSchedules()

    // Email right after social so YouTube encode/upload cannot eat the time budget.
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
