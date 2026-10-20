import { NextResponse } from 'next/server'
import { runDueSocialSchedules } from '@/libs/social/run-due-schedules'
import { runDailyYoutubeShort } from '@/libs/social/run-daily-youtube-short'
import { runNewsletterCronPipeline } from '@/libs/newsletter-cron'
import { handleApiError } from '@/libs/api'
import { withApiLogging } from '@/libs/api-middleware'
import { logError } from '@/libs/logger'

/**
 * Single daily Vercel Cron (Hobby: 1 job):
 * 1) due social schedules → 2) backlog YouTube Short → 3) quote email.
 * Protect with CRON_SECRET.
 */
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

    const schedules = await runDueSocialSchedules()

    let youtubeShort = null
    try {
      youtubeShort = await runDailyYoutubeShort()
    } catch (error) {
      logError('Daily YouTube Short (after social cron) failed', error)
      youtubeShort = { ok: false, error: error.message || 'Failed' }
    }

    // After social/YT so email can match today's successful social card.
    let newsletter = null
    try {
      newsletter = await runNewsletterCronPipeline()
    } catch (error) {
      logError('Newsletter (after social cron) failed', error)
      newsletter = { ok: false, error: error.message || 'Failed' }
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
