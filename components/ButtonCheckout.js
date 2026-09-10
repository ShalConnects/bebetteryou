'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { appConfig } from '@/config/app'

const SIGNIN = '/auth/signin'

function lemonCheckoutUrl(email) {
  const base = process.env.NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL
  if (!base) throw new Error('Lemon Squeezy checkout URL is not configured')
  if (!email) return base
  const sep = base.includes('?') ? '&' : '?'
  return `${base}${sep}checkout[email]=${encodeURIComponent(email)}`
}

export default function ButtonCheckout({
  priceId,
  provider = appConfig.paymentProvider,
  children,
  className = '',
}) {
  const [loading, setLoading] = useState(false)
  const { data: session } = useSession()

  const handleCheckout = async () => {
    if (!session) {
      window.location.href = SIGNIN
      return
    }

    if (provider === 'stripe' && !priceId) {
      window.location.href = '/auth/register'
      return
    }

    setLoading(true)
    try {
      if (provider === 'lemonsqueezy') {
        window.location.href = lemonCheckoutUrl(session.user?.email)
        return
      }

      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      })

      const { sessionId, error } = await response.json()
      if (!response.ok || !sessionId) throw new Error(error || 'Checkout failed')

      const { loadStripe } = await import('@stripe/stripe-js')
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
      await stripe.redirectToCheckout({ sessionId })
    } catch (error) {
      console.error('Checkout error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleCheckout}
      disabled={loading}
      className={`px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors ${className}`}
    >
      {loading ? 'Processing...' : children}
    </button>
  )
}
