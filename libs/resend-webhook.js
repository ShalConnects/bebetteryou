import { Webhook } from 'svix'
import { connectDB } from '@/libs/mongo'
import { logError, logInfo } from '@/libs/logger'
import { unsubscribeNewsletterSubscriber } from '@/libs/newsletter'
import { recipientFromResendData } from '@/libs/resend-webhook-parse'
import NewsletterDeliveryEvent from '@/models/NewsletterDeliveryEvent'

export { recipientFromResendData } from '@/libs/resend-webhook-parse'

export function verifyResendWebhook(payload, headers, secret) {
  const wh = new Webhook(secret)
  return wh.verify(payload, {
    'svix-id': headers.id || headers['svix-id'] || '',
    'svix-timestamp': headers.timestamp || headers['svix-timestamp'] || '',
    'svix-signature': headers.signature || headers['svix-signature'] || '',
  })
}

/**
 * Persist bounce/complaint and soft-unsubscribe newsletter leads.
 * Idempotent on (emailId, type) when Resend retries the webhook.
 */
export async function handleResendWebhookEvent(event) {
  const type = event?.type
  if (type !== 'email.bounced' && type !== 'email.complained') {
    return { handled: false, reason: 'ignored' }
  }

  const data = event.data || {}
  const email = recipientFromResendData(data)
  if (!email) {
    logInfo('Resend webhook missing recipient', { type })
    return { handled: false, reason: 'no_email' }
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
