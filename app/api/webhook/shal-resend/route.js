import { NextResponse } from 'next/server'
import { handleApiError } from '@/libs/api'
import { logError } from '@/libs/logger'
import { handleShalResendWebhookEvent, verifyResendWebhook } from '@/libs/shal-outreach/webhook'

export const runtime = 'nodejs'

/**
 * ShalConnects Resend webhooks (bounces / complaints).
 * Configure in the ShalConnects Resend project, not BeBetterYou’s.
 * URL: /api/webhook/shal-resend
 * Events: email.bounced, email.complained
 */
export async function POST(request) {
  const secret = (process.env.SHALCONNECTS_RESEND_WEBHOOK_SECRET || '').trim()
  if (!secret) {
    logError('SHALCONNECTS_RESEND_WEBHOOK_SECRET is not set', new Error('Missing webhook secret'))
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  const payload = await request.text()
  const headers = {
    id: request.headers.get('svix-id') || '',
    timestamp: request.headers.get('svix-timestamp') || '',
    signature: request.headers.get('svix-signature') || '',
  }

  if (!headers.id || !headers.timestamp || !headers.signature) {
    return NextResponse.json({ error: 'Missing Svix signature headers' }, { status: 400 })
  }

  let event
  try {
    event = verifyResendWebhook(payload, headers, secret)
  } catch (error) {
    logError('Shal Resend webhook verification failed', error)
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 })
  }

  try {
    const result = await handleShalResendWebhookEvent(event)
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    const errorResponse = handleApiError(error)
    if (errorResponse) return errorResponse
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
