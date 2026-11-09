import { NextResponse } from 'next/server'
import { requireAdmin } from '@/libs/auth-helpers'
import { fieldsToPatch } from '@/libs/integrations/credentials'
import { listIntegrationStatus } from '@/libs/integrations/status'
import { clearIntegration, saveIntegration } from '@/libs/integrations/store'
import { postQuote, previewQuoteShort, readyNetworks } from '@/libs/social'
import { manualPostResults } from '@/libs/social/post-log'
import { readPosts, recordPost } from '@/libs/social/post-store'
import {
  cancelSchedule,
  createSchedule,
  listSchedules,
  recordDoneSocialSend,
} from '@/libs/social/schedule-store'
import { runAtFromPostDate } from '@/libs/social/post-slot'
import { refreshNetworkStatus } from '@/libs/social/status-cache'
import { publishQuote, readQuotes } from '@/libs/quotes-store'
import { logError, logInfo } from '@/libs/logger'
import { previewWeekReview, publishWeekReview } from '@/libs/week-review-publish'

/** Post / preview / schedule / week-review / integrations — one Hobby function. */
export const maxDuration = 300

export async function GET(req) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const url = new URL(req.url)
  const slug = url.searchParams.get('slug')?.trim()

  /** Credential status (was /api/integrations). */
  if (url.searchParams.get('integrations') === '1') {
    return NextResponse.json(await listIntegrationStatus())
  }

  /** Short preview (was /api/social/preview). */
  if (url.searchParams.get('preview') === '1') {
    if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })
    try {
      const { video } = await previewQuoteShort(slug)
      return new NextResponse(new Uint8Array(video), {
        headers: { 'Content-Type': 'video/mp4', 'Cache-Control': 'no-store' },
      })
    } catch (err) {
      return NextResponse.json({ error: err.message || 'Failed' }, { status: 400 })
    }
  }

  /** Per-quote schedules (was /api/social/schedule). */
  if (url.searchParams.get('schedules') === '1') {
    if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })
    return NextResponse.json({ schedules: await listSchedules(slug) })
  }

  /** Week in review preview (was /api/quotes/week-review). */
  if (url.searchParams.get('week') === '1') {
    if (url.searchParams.get('dry') !== '1') {
      return NextResponse.json({ error: 'Use ?week=1&dry=1' }, { status: 400 })
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
        return new NextResponse(new Uint8Array(result.video), {
          headers: { 'Content-Type': 'video/mp4', 'Cache-Control': 'no-store' },
        })
      }
      const { video: _video, ...meta } = result
      return NextResponse.json(meta)
    } catch (err) {
      logError('Week review API GET failed', err)
      return NextResponse.json({ error: err.message || 'Week review preview failed' }, { status: 500 })
    }
  }

  const [networks, posts] = await Promise.all([
    readyNetworks(),
    slug ? readPosts(slug) : Promise.resolve({}),
  ])
  return NextResponse.json({ networks, posts })
}

export async function POST(req) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => null)

  /** Save / clear integration credentials (was /api/integrations). */
  if (body?.integrations === true || body?.integrations === 1) {
    const network = String(body?.network || '').trim()
    if (!network || network === 'youtube' || network === 'resend' || network === 'ses') {
      return NextResponse.json({ error: 'Network not editable here' }, { status: 400 })
    }
    try {
      if (body?.clear) {
        await clearIntegration(network)
        refreshNetworkStatus()
        return NextResponse.json({ ok: true, cleared: true, ...(await listIntegrationStatus()) })
      }
      const patch = fieldsToPatch(network, body?.fields || {})
      const hasSomething =
        patch.accessToken ||
        patch.refreshToken ||
        Object.values(patch.extras || {}).some((v) => String(v || '').trim())
      if (!hasSomething) {
        return NextResponse.json({ error: 'Provide at least one field' }, { status: 400 })
      }
      await saveIntegration(network, { ...patch, lastError: '' })
      refreshNetworkStatus()
      return NextResponse.json({ ok: true, ...(await listIntegrationStatus()) })
    } catch (err) {
      return NextResponse.json({ error: err.message || 'Save failed' }, { status: 400 })
    }
  }

  /** Week in review publish. */
  if (body?.week === true || body?.week === 1) {
    logInfo('Week review API POST')
    try {
      const result = await publishWeekReview()
      if (result.skipped) {
        return NextResponse.json(result, { status: 400 })
      }
      return NextResponse.json(result)
    } catch (err) {
      logError('Week review API POST failed', err)
      return NextResponse.json({ error: err.message || 'Week review publish failed' }, { status: 500 })
    }
  }

  /** Create schedule (was /api/social/schedule POST). */
  if (body?.schedule === true || body?.schedule === 1) {
    const slug = body?.slug?.trim()
    const networks = Array.isArray(body?.networks) ? body.networks : []
    let runAt
    try {
      runAt = runAtFromPostDate(body?.date || body?.runAt)
    } catch (err) {
      return NextResponse.json({ error: err.message || 'Pick a date' }, { status: 400 })
    }
    if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })
    const quote = (await readQuotes()).find((q) => q.slug === slug)
    if (!quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 })

    const status = await readyNetworks()
    const ready = new Set(status.filter((n) => n.ready).map((n) => n.id))
    const selected = [...new Set(networks.map(String))].filter((id) => ready.has(id))
    if (!selected.length) {
      return NextResponse.json({ error: 'Select at least one ready network' }, { status: 400 })
    }
    try {
      const schedule = await createSchedule({ slug, networks: selected, runAt })
      return NextResponse.json({ schedule }, { status: 201 })
    } catch (err) {
      return NextResponse.json({ error: err.message || 'Failed to schedule' }, { status: 400 })
    }
  }

  const slug = body?.slug?.trim()
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })

  const networks = [...new Set((body?.networks || []).map(String).filter(Boolean))]
  if (!networks.length) return NextResponse.json({ error: 'networks required' }, { status: 400 })

  try {
    const statusList = await readyNetworks()
    const known = new Set(statusList.map((n) => n.id))
    const invalid = networks.filter((id) => !known.has(id))
    if (invalid.length) {
      return NextResponse.json({ error: `Unknown network: ${invalid.join(', ')}` }, { status: 400 })
    }

    /** Site + social go live together on Post now / Mark posted — only after networks are valid. */
    await publishQuote(slug)

    if (body?.manual) {
      const labels = Object.fromEntries(statusList.map((n) => [n.id, n.label]))
      const results = manualPostResults(slug, networks, labels)
      for (const row of results) await recordPost(slug, row)
      await recordDoneSocialSend({ slug, networks, results })
      return NextResponse.json({ results })
    }

    const results = await postQuote(slug, networks)
    if (results.some((r) => r.ok)) {
      await recordDoneSocialSend({ slug, networks, results })
    }
    return NextResponse.json({ results })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 400 })
  }
}

export async function DELETE(req) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth
  const id = new URL(req.url).searchParams.get('id')?.trim()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  try {
    const schedule = await cancelSchedule(id)
    return NextResponse.json({ schedule })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Failed to cancel' }, { status: 400 })
  }
}
