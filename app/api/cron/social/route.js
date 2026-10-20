import { NextResponse } from 'next/server'
import { runDueSocialSchedules } from '@/libs/social/run-due-schedules'
import { runDailyYoutubeShort } from '@/libs/social/run-daily-youtube-short'
import { handleApiError } from '@/libs/api'
import { withApiLogging } from '@/libs/api-middleware'
import { logError } from '@/libs/logger'

/**
 * Vercel Cron — due social schedules, then one backlog YouTube Short if none today.
 * One route (Hobby: ≤12 functions, ≤2 crons). Protect with CRON_SECRET.
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
    // After schedules so a scheduled YT post counts as “already today”.
    let youtubeShort = null
    try {
      youtubeShort = await runDailyYoutubeShort()
    } catch (error) {
      logError('Daily YouTube Short (after social cron) failed', error)
      youtubeShort = { ok: false, error: error.message || 'Failed' }
    }
    return NextResponse.json({ ok: true, ...schedules, youtubeShort })
  } catch (error) {
    logError('Social schedule cron failed', error)
    const errorResponse = handleApiError(error)
    if (errorResponse) return errorResponse
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 })
  }
}

export const GET = withApiLogging(handleGet)
