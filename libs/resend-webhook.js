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

/**
 * Verify Svix signature, then parse the raw body.
 * Svix 2.x `Webhook.verify` only checks the signature and returns undefined
 * (`jsonParse: false`) — callers must parse the payload themselves.
 */
export function verifyResendWebhook(payload, headers, secret) {
  const wh = new Webhook(secret)
  wh.verify(payload, {
    'svix-id': headers.id || headers['svix-id'] || '',
    'svix-timestamp': headers.timestamp || headers['svix-timestamp'] || '',
    'svix-signature': headers.signature || headers['svix-signature'] || '',
  })

  let event
  try {
    event = typeof payload === 'string' ? JSON.parse(payload) : payload
  } catch (error) {
    throw new Error('Invalid webhook JSON payload')
  }
  return normalizeResendWebhookEvent(event)
}

/** Upsert a bounce/complaint row (idempotent on emailId+type when present). */
export async function upsertNewsletterDeliveryEvent({
  email,
  type,
  subject,
  emailId,
  bounceType,
  bounceSubType,
  message,
  createdAt,
}) {
  await connectDB()
  const normalizedEmail = String(email || '')
    .toLowerCase()
    .trim()
  if (!normalizedEmail) return null
  if (type !== 'bounced' && type !== 'complained') return null

  const doc = {
    email: normalizedEmail,
    type,
    subject: subject || undefined,
    bounceType: bounceType || undefined,
    bounceSubType: bounceSubType || undefined,
    message: message || (type === 'complained' ? 'Marked as spam' : 'Email bounced'),
    createdAt: createdAt ? new Date(createdAt) : new Date(),
  }

  if (emailId) {
    return NewsletterDeliveryEvent.findOneAndUpdate(
      { emailId: String(emailId), type },
      { $setOnInsert: { ...doc, emailId: String(emailId) } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean()
  }

  return NewsletterDeliveryEvent.create(doc)
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

  let eventStored = false
  try {
    await upsertNewsletterDeliveryEvent({
      email,
      type: kind,
      subject: data.subject || undefined,
      emailId,
      bounceType: bounce.type || undefined,
      bounceSubType: bounce.subType || undefined,
      message,
      createdAt: data.created_at || normalized.created_at,
    })
    eventStored = true
  } catch (error) {
    if (error?.code !== 11000) {
      logError('Failed to store Resend delivery event', error, { email, type: kind })
      if (unsub?.ok) {
        return { handled: true, email, type: kind, unsubscribed: true, eventStored: false }
      }
      throw error
    }
    eventStored = true
  }

  logInfo('Resend delivery event processed', {
    email,
    type: kind,
    unsubscribed: Boolean(unsub?.ok),
    already: Boolean(unsub?.already),
    eventStored,
  })

  return {
    handled: true,
    email,
    type: kind,
    unsubscribed: Boolean(unsub?.ok),
    already: Boolean(unsub?.already),
    eventStored,
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
