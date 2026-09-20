import { NextResponse } from 'next/server'
import { handleApiError } from '@/libs/api'
import { logError } from '@/libs/logger'
import { handleResendWebhookEvent, verifyResendWebhook } from '@/libs/resend-webhook'

export const runtime = 'nodejs'

export async function POST(request) {
  const secret = (process.env.RESEND_WEBHOOK_SECRET || '').trim()
  if (!secret) {
    logError('RESEND_WEBHOOK_SECRET is not set', new Error('Missing webhook secret'))
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
    logError('Resend webhook verification failed', error)
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 })
  }

  try {
    const result = await handleResendWebhookEvent(event)
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    const errorResponse = handleApiError(error)
    if (errorResponse) return errorResponse
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
