import { requireAdmin } from '@/libs/auth-helpers'
import { logError, logInfo } from '@/libs/logger'
import { previewWeekReview, publishWeekReview } from '@/libs/week-review-publish'
import { NextResponse } from 'next/server'

/** Manual Friday week-in-review: preview (dry-run) or publish. */
export const maxDuration = 300

/** `?preview=1` collage+plan JSON; `?preview=1&part=short` → MP4. No posts/email. */
export async function GET(req) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const url = new URL(req.url)
  if (url.searchParams.get('preview') !== '1') {
    return NextResponse.json({ error: 'Use ?preview=1' }, { status: 400 })
  }

  const wantShort = url.searchParams.get('part') === 'short'
  logInfo('Week review API GET', { wantShort })

  try {
    const result = await previewWeekReview(new Date(), { encodeShort: wantShort })
    if (result.skipped) {
      logInfo('Week review API GET skipped', { reason: result.reason })
      return NextResponse.json(result, { status: 400 })
    }
    if (wantShort) {
      logInfo('Week review API GET short response', { bytes: result.video?.length })
      return new NextResponse(new Uint8Array(result.video), {
        headers: { 'Content-Type': 'video/mp4', 'Cache-Control': 'no-store' },
      })
    }
    const { video: _video, ...meta } = result
    logInfo('Week review API GET meta response', {
      mode: meta.mode,
      quotes: meta.quotes?.length,
      collage: meta.collage,
    })
    return NextResponse.json(meta)
  } catch (err) {
    logError('Week review API GET failed', err)
    return NextResponse.json({ error: err.message || 'Week review preview failed' }, { status: 500 })
  }
}

export async function POST() {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  logInfo('Week review API POST')
  try {
    const result = await publishWeekReview()
    if (result.skipped) {
      logInfo('Week review API POST skipped', { reason: result.reason })
      return NextResponse.json(result, { status: 400 })
    }
    logInfo('Week review API POST ok', { quotes: result.quotes?.length })
    return NextResponse.json(result)
  } catch (err) {
    logError('Week review API POST failed', err)
    return NextResponse.json({ error: err.message || 'Week review publish failed' }, { status: 500 })
  }
}
