import { NextResponse } from 'next/server'
import { appConfig } from '@/config/app'
import { analyticsEvents } from '@/config/analytics'
import { guard } from '@/libs/api-guard'
import { isLoopbackHost, resolveAttribution } from '@/libs/analytics-channel'
import { describeRequest } from '@/libs/analytics-request'
import { analyticsReady, recordEvent } from '@/libs/analytics-store'
import { rateLimitPresets } from '@/libs/rate-limit'
import { trackEventSchema } from '@/libs/validation-schemas'

/** Beacons ignore the body, so every outcome that is not a 429 is an empty 204. */
function noContent() {
  return new NextResponse(null, { status: 204 })
}

/**
 * @swagger
 * /api/track:
 *   post:
 *     summary: Record a first-party analytics event (pageview, download, share)
 *     tags: [Analytics]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, enum: [pageview, quote_download, quote_share] }
 *               path: { type: string }
 *               slug: { type: string }
 *               target: { type: string }
 *               referrer: { type: string }
 *               source: { type: string }
 *               medium: { type: string }
 *               campaign: { type: string }
 *     responses:
 *       204: { description: Accepted (also returned when tracking is off or the caller is a bot) }
 *       429: { description: Rate limit exceeded }
 */
async function handlePost(request) {
  if (!appConfig.features.enableAnalytics || !analyticsReady()) return noContent()

  const gate = await guard(request, {
    schema: trackEventSchema,
    preset: rateLimitPresets.analytics,
  })
  if (gate instanceof NextResponse) return gate

  const { data } = gate
  const caller = describeRequest(request.headers)
  if (caller.bot) return noContent()
  const requestHost =
    (request.headers.get('x-forwarded-host') || '').split(',')[0].trim() ||
    request.headers.get('host') ||
    ''
  if (isLoopbackHost(requestHost)) return noContent()

  const attribution = resolveAttribution({
    referrer: data.referrer,
    source: data.source,
    medium: data.medium,
    campaign: data.campaign,
    /**
     * The host being browsed as well as the configured one: on localhost, or
     * behind a www redirect, they differ and every internal link would
     * otherwise be counted as a referral from ourselves.
     */
    siteHost: [
      request.headers.get('x-forwarded-host'),
      request.headers.get('host'),
      appConfig.siteUrl,
    ],
  })

  await recordEvent({
    name: data.name,
    /** Query strings can carry emails and tokens, so only the path is kept. */
    path: data.name === analyticsEvents.pageview ? data.path.split('?')[0] : data.path,
    slug: data.slug,
    target: data.target,
    visitor: caller.visitor,
    device: caller.device,
    country: caller.country,
    ...attribution,
  })

  return noContent()
}

/**
 * No `withApiLogging` here on purpose: this route fires on every page view, and
 * logging each one would bury the requests that actually need looking at.
 */
export const POST = handlePost
