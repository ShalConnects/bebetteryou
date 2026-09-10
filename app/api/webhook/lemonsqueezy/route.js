import { NextResponse } from 'next/server'
import { verifyLemonSqueezyWebhook } from '@/libs/lemonsqueezy'
import { setUserAccess } from '@/libs/user-helpers'
import { logInfo } from '@/libs/logger'

export async function POST(request) {
  const body = await request.text()
  const signature = request.headers.get('x-signature') || ''

  if (!(await verifyLemonSqueezyWebhook(body, signature))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const payload = JSON.parse(body)
  const eventName = payload?.meta?.event_name
  const attrs = payload?.data?.attributes

  switch (eventName) {
    case 'order_created':
    case 'subscription_created': {
      const email = attrs?.user_email?.toLowerCase()
      if (email) {
        const updated = await setUserAccess(
          { email },
          {
            hasAccess: true,
            lsCustomerId: attrs?.customer_id?.toString(),
            subscriptionStatus: 'active',
          }
        )
        if (!updated) return NextResponse.json({ error: 'Update failed' }, { status: 500 })
      }
      break
    }
    case 'subscription_cancelled':
    case 'subscription_expired': {
      const customerId = attrs?.customer_id?.toString()
      if (customerId) {
        const updated = await setUserAccess(
          { lsCustomerId: customerId },
          { hasAccess: false, subscriptionStatus: 'canceled' }
        )
        if (!updated) return NextResponse.json({ error: 'Update failed' }, { status: 500 })
      }
      break
    }
    default:
      logInfo(`Unhandled Lemon Squeezy event: ${eventName}`, { eventName })
  }

  return NextResponse.json({ received: true })
}
