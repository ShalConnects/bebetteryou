import Stripe from 'stripe'
import { appConfig, getUrl } from '@/config/app'
import { logError } from './logger'

let _stripe
/** Lazy client so builds succeed without STRIPE_SECRET_KEY. */
export function getStripe() {
  if (_stripe) return _stripe
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
  _stripe = new Stripe(key, { apiVersion: '2023-10-16' })
  return _stripe
}

/** @deprecated Prefer getStripe(); kept for existing imports. */
export const stripe = new Proxy(
  {},
  {
    get(_t, prop) {
      return Reflect.get(getStripe(), prop)
    },
  }
)

export const createCustomer = async (email, name) => {
  try {
    const customer = await stripe.customers.create({
      email,
      name,
    })
    return customer
  } catch (error) {
    logError('Error creating customer', error)
    throw error
  }
}

export const createSubscription = async (customerId, priceId) => {
  try {
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    })
    return subscription
  } catch (error) {
    logError('Error creating subscription', error)
    throw error
  }
}

export const createCheckoutSession = async (priceId, customerId, userId) => {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer: customerId,
      success_url: `${getUrl(appConfig.dashboardUrl)}?success=true`,
      cancel_url: `${getUrl(appConfig.pricingUrl)}?canceled=true`,
      metadata: {
        userId: userId,
      },
    })
    return session
  } catch (error) {
    logError('Error creating checkout session', error)
    throw error
  }
}

export const createPortalSession = async (customerId) => {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: getUrl(appConfig.dashboardUrl),
    })
    return session
  } catch (error) {
    logError('Error creating portal session', error)
    throw error
  }
}
