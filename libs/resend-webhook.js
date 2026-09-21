import { Webhook } from 'svix'
import { connectDB } from '@/libs/mongo'
import { logError, logInfo } from '@/libs/logger'
import { unsubscribeNewsletterSubscriber } from '@/libs/newsletter'
import {
  recipientFromResendData,
  resendEventData,
  resolveResendEventType,
} from '@/libs/resend-webhook-parse'
import NewsletterDeliveryEvent from '@/models/NewsletterDeliveryEvent'

export {
  recipientFromResendData,
  resendEventData,
  resolveResendEventType,
} from '@/libs/resend-webhook-parse'

export function verifyResendWebhook(payload, headers, secret) {
  const wh = new Webhook(secret)
  let event = wh.verify(payload, {
    'svix-id': headers.id || headers['svix-id'] || '',
    'svix-timestamp': headers.timestamp || headers['svix-timestamp'] || '',
    'svix-signature': headers.signature || headers['svix-signature'] || '',
  })
  if (typeof event === 'string') {
    try {
      event = JSON.parse(event)
    } catch {
      /* keep string; handler will ignore */
    }
  }
  return event
}

/**
 * Persist bounce/complaint and soft-unsubscribe newsletter leads.
 * Idempotent on (emailId, type) when Resend retries the webhook.
 */
export async function handleResendWebhookEvent(event) {
  const type = resolveResendEventType(event)
  if (type !== 'email.bounced' && type !== 'email.complained') {
    logInfo('Resend webhook ignored', {
      receivedType: event?.type ?? null,
      resolvedType: type || null,
      hasBounce: Boolean(event?.data?.bounce || event?.bounce),
    })
    return {
      handled: false,
      reason: 'ignored',
      receivedType: event?.type ?? null,
      resolvedType: type || null,
    }
  }

  const data = resendEventData(event)
  const email = recipientFromResendData(data)
  if (!email) {
    logInfo('Resend webhook missing recipient', { type })
    return { handled: false, reason: 'no_email', resolvedType: type }
  }

  const kind = type === 'email.bounced' ? 'bounced' : 'complained'
  const bounce = data.bounce || {}
  const emailId = data.email_id ? String(data.email_id) : undefined
  const message =
    bounce.message ||
    (kind === 'complained' ? 'Marked as spam' : 'Email bounced')

  await connectDB()

  try {
    await NewsletterDeliveryEvent.create({
      email,
      type: kind,
      subject: data.subject || undefined,
      emailId,
      bounceType: bounce.type || undefined,
      bounceSubType: bounce.subType || undefined,
      message,
      createdAt: data.created_at ? new Date(data.created_at) : new Date(),
    })
  } catch (error) {
    // Duplicate webhook delivery — still ensure unsubscribed.
    if (error?.code !== 11000) {
      logError('Failed to store Resend delivery event', error, { email, type: kind })
      throw error
    }
  }

  const unsub = await unsubscribeNewsletterSubscriber(email)
  logInfo('Resend delivery event processed', {
    email,
    type: kind,
    unsubscribed: Boolean(unsub?.ok),
  })

  return { handled: true, email, type: kind, unsubscribed: Boolean(unsub?.ok) }
}

export async function listNewsletterDeliveryEvents(limit = 100) {
  await connectDB()
  const n = Math.min(Math.max(Number(limit) || 100, 1), 500)
  return NewsletterDeliveryEvent.find()
    .sort({ createdAt: -1 })
    .limit(n)
    .lean()
}
