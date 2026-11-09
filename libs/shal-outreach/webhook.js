import { logInfo } from '@/libs/logger'
import {
  normalizeResendWebhookEvent,
  recipientFromResendData,
  resendEventData,
  resolveResendEventType,
  verifyResendWebhook,
} from '@/libs/resend-webhook'
import { recordDeliveryEvent } from './store.js'

export { verifyResendWebhook }

/**
 * Handle bounce/complaint for ShalConnects outreach only.
 * Does not touch BeBetterYou newsletter subscribers.
 */
export async function handleShalResendWebhookEvent(event) {
  const normalized = normalizeResendWebhookEvent(event)
  const type = resolveResendEventType(normalized)
  if (type !== 'email.bounced' && type !== 'email.complained') {
    logInfo('Shal outreach Resend webhook ignored', {
      receivedType: event?.type ?? null,
      resolvedType: type || null,
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
    return { handled: false, reason: 'no_email', resolvedType: type }
  }

  const kind = type === 'email.bounced' ? 'bounced' : 'complained'
  const bounce = data.bounce || {}
  const result = await recordDeliveryEvent({
    email,
    type: kind,
    emailId: data.email_id ? String(data.email_id) : undefined,
    bounceType: bounce.type || undefined,
    bounceSubType: bounce.subType || bounce.sub_type || undefined,
    message: bounce.message || (kind === 'complained' ? 'Marked as spam' : 'Email bounced'),
    createdAt: data.created_at || undefined,
  })

  return { handled: true, ...result }
}
