import { NextResponse } from 'next/server'
import { stripe } from '@/libs/stripe'
import { setUserAccess } from '@/libs/user-helpers'
import { handleApiError } from '@/libs/api'
import { logError, logInfo } from '@/libs/logger'

export async function POST(request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    logError('STRIPE_WEBHOOK_SECRET is not set', new Error('Missing webhook secret'))
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    return NextResponse.json(
      { error: 'Webhook signature verification failed', details: err.message },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const filter = session.metadata?.userId
          ? { _id: session.metadata.userId }
          : { stripeCustomerId: session.customer }
        await setUserAccess(filter, {
          hasAccess: true,
          stripeCustomerId: session.customer,
          subscriptionStatus: 'active',
          subscriptionId: session.subscription || null,
        })
        break
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object
        await setUserAccess(
          { stripeCustomerId: subscription.customer },
          {
            hasAccess: subscription.status === 'active',
            subscriptionStatus: subscription.status,
            subscriptionId: subscription.id,
          }
        )
        break
      }
      case 'customer.subscription.deleted': {
        const deleted = event.data.object
        await setUserAccess(
          { stripeCustomerId: deleted.customer },
          {
            hasAccess: false,
            subscriptionStatus: 'canceled',
            subscriptionId: null,
          }
        )
        break
      }
      default:
        logInfo(`Unhandled webhook event type: ${event.type}`, { eventType: event.type })
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    const errorResponse = handleApiError(error)
    if (errorResponse) return errorResponse
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
