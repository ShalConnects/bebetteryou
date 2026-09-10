import { timingSafeEqual } from 'crypto'
import { NextResponse } from 'next/server'
import { logError, logInfo } from '@/libs/logger'
import { advanceOrder } from '@/libs/print-orders'

/**
 * Printful v1 webhooks are not HMAC-signed, so the URL itself is the credential:
 * register it with `?secret=<PRINTFUL_WEBHOOK_SECRET>` (a header of the same name
 * also works) and treat that value like an API key.
 */
const statusByEvent = {
  package_shipped: 'shipped',
  order_failed: 'submit_failed',
  order_canceled: 'cancelled',
}

function authorized(request) {
  const expected = process.env.PRINTFUL_WEBHOOK_SECRET
  if (!expected) return false
  const provided =
    request.headers.get('x-pf-webhook-secret') ||
    new URL(request.url).searchParams.get('secret') ||
    ''
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function POST(request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const event = await request.json().catch(() => null)
  const status = statusByEvent[event?.type]
  const orderNumber = event?.data?.order?.external_id

  // 200 on anything unrecognised so Printful stops retrying.
  if (!status || !orderNumber) {
    logInfo('Unhandled Printful webhook', { type: event?.type })
    return NextResponse.json({ received: true })
  }

  try {
    await advanceOrder(orderNumber, status, {
      failureReason: status === 'submit_failed' ? event?.data?.reason || 'Printful reported failure' : null,
    })
    logInfo('Print order updated from Printful webhook', { orderNumber, status })
  } catch (error) {
    // An impossible move or an unknown order will never succeed, so acknowledge
    // it. Anything else — a database blip — must return 500 so Printful retries
    // rather than dropping the update on the floor.
    if (!error.transition) {
      logError('Printful webhook handling failed', error, { orderNumber, status })
      return NextResponse.json({ error: 'Temporarily unavailable' }, { status: 500 })
    }
    logInfo('Printful webhook ignored', { orderNumber, status, reason: error.message })
  }

  return NextResponse.json({ received: true })
}
