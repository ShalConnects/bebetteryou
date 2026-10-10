import { Webhook } from 'svix'
import { connectDB } from '@/libs/mongo'
import { logError, logInfo } from '@/libs/logger'
import { unsubscribeNewsletterSubscriber } from '@/libs/newsletter'
import {
  normalizeResendWebhookEvent,
  recipientFromResendData,
  resendEventData,
  resolveResendEventType,
} from '@/libs/resend-webhook-parse'
import NewsletterDeliveryEvent from '@/models/NewsletterDeliveryEvent'

export {
  normalizeResendWebhookEvent,
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
  return normalizeResendWebhookEvent(event)
}

/**
 * Persist bounce/complaint and soft-unsubscribe newsletter leads.
 * Unsubscribe is attempted even if event persistence fails.
 * Idempotent on (emailId, type) when Resend retries the webhook.
 */
export async function handleResendWebhookEvent(event) {
  const normalized = normalizeResendWebhookEvent(event)
  const type = resolveResendEventType(normalized)
  if (type !== 'email.bounced' && type !== 'email.complained') {
    logInfo('Resend webhook ignored', {
      receivedType: event?.type ?? null,
      resolvedType: type || null,
      hasBounce: Boolean(resendEventData(normalized).bounce),
      keys: event && typeof event === 'object' ? Object.keys(event) : [],
    })
    return {
      handled: false,
      reason: 'ignored',
      receivedType: event?.type ?? null,
      resolvedType: type || null,
    }
  }

  const data = resendEventData(normalized)
  const email = recipientFromResendData(data)
  if (!email) {
    logInfo('Resend webhook missing recipient', {
      type,
      dataKeys: data && typeof data === 'object' ? Object.keys(data) : [],
    })
    return { handled: false, reason: 'no_email', resolvedType: type }
  }

  const kind = type === 'email.bounced' ? 'bounced' : 'complained'
  const bounce = data.bounce || {}
  const emailId = data.email_id ? String(data.email_id) : undefined
  const message =
    bounce.message ||
    (kind === 'complained' ? 'Marked as spam' : 'Email bounced')

  // Unsubscribe first — don't let event storage failures leave them Active.
  let unsub = { ok: false }
  try {
    unsub = await unsubscribeNewsletterSubscriber(email)
  } catch (error) {
    logError('Failed to unsubscribe after Resend delivery event', error, { email, type: kind })
  }

  try {
    await connectDB()
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
    if (error?.code !== 11000) {
      logError('Failed to store Resend delivery event', error, { email, type: kind })
      // Still report handled if we unsubscribed — Resend should not retry forever.
      if (unsub?.ok) {
        return { handled: true, email, type: kind, unsubscribed: true, eventStored: false }
      }
      throw error
    }
  }

  logInfo('Resend delivery event processed', {
    email,
    type: kind,
    unsubscribed: Boolean(unsub?.ok),
    already: Boolean(unsub?.already),
  })

  return {
    handled: true,
    email,
    type: kind,
    unsubscribed: Boolean(unsub?.ok),
    already: Boolean(unsub?.already),
  }
}

export async function listNewsletterDeliveryEvents(limit = 100) {
  await connectDB()
  const n = Math.min(Math.max(Number(limit) || 100, 1), 500)
  return NewsletterDeliveryEvent.find()
    .sort({ createdAt: -1 })
    .limit(n)
    .lean()
}
