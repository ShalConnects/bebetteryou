/**
 * Environment validation — tiered by deploy target and enabled features.
 */

const isProd = process.env.NODE_ENV === 'production'
const isVercel = Boolean(process.env.VERCEL)

function unset(name) {
  return !process.env[name]
}

/** @returns {{ missing: string[], warnings: string[] }} */
export function validateEnv() {
  const missing = []
  const warnings = []

  const require = (name) => {
    if (unset(name)) missing.push(name)
  }

  if (isProd || isVercel) {
    require('MONGODB_URI')
    require('NEXTAUTH_SECRET')
    require('NEXTAUTH_URL')
    require('ADMIN_EMAIL')
    if (unset('ADMIN_PASSWORD') && unset('ADMIN_PASSWORD_HASH')) {
      warnings.push('ADMIN_PASSWORD or ADMIN_PASSWORD_HASH — admin sign-in disabled without it')
    }
    if (isVercel && unset('BLOB_READ_WRITE_TOKEN')) {
      warnings.push('BLOB_READ_WRITE_TOKEN — quote uploads on Vercel')
    }
  } else {
    if (unset('NEXTAUTH_SECRET') || unset('NEXTAUTH_URL')) {
      warnings.push('NEXTAUTH_SECRET + NEXTAUTH_URL — needed for sign-in')
    }
    if (unset('ADMIN_EMAIL')) warnings.push('ADMIN_EMAIL — needed for quote admin')
    if (unset('ADMIN_PASSWORD') && unset('ADMIN_PASSWORD_HASH')) {
      warnings.push('ADMIN_PASSWORD or ADMIN_PASSWORD_HASH — admin password login')
    }
    if (unset('MONGODB_URI')) warnings.push('MONGODB_URI unset — using data/quotes.json')
  }

  if (process.env.ENABLE_PRICING === 'true') {
    const provider = process.env.NEXT_PUBLIC_PAYMENT_PROVIDER || 'stripe'
    if (provider === 'stripe' && unset('STRIPE_SECRET_KEY')) {
      warnings.push('STRIPE_SECRET_KEY — pricing enabled')
    }
    if (provider === 'lemonsqueezy' && unset('NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL')) {
      warnings.push('NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL — pricing enabled')
    }
  }

  if (process.env.NEXT_PUBLIC_GOOGLE_ENABLED !== 'false' && unset('GOOGLE_CLIENT_ID')) {
    warnings.push('GOOGLE_CLIENT_ID — Google sign-in shown but not configured')
  }
  if (process.env.NEXT_PUBLIC_GITHUB_ENABLED === 'true' && unset('GITHUB_ID')) {
    warnings.push('GITHUB_ID — GitHub sign-in enabled but not configured')
  }

  return { missing, warnings }
}

export function assertEnv() {
  const { missing, warnings } = validateEnv()

  if (missing.length) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
        'Copy env.example to .env.local and fill in the values.'
    )
  }

  if (warnings.length && !isProd) {
    console.warn('[env]', warnings.join('\n[env] '))
  }

  return true
}
