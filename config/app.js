/**
 * Application configuration
 * Centralized configuration for app name, branding, URLs, and metadata
 * Update these values when using this boilerplate for a new project
 */

const name = process.env.APP_NAME || 'BeBetterYou'

export const appConfig = {
  // App Information
  name,
  description:
    process.env.APP_DESCRIPTION ||
    'Got the motivation? Now grow beyond impossible. Daily quote cards and a little fire.',
  shortName: process.env.APP_SHORT_NAME || 'Be',
  
  // URLs
  url: process.env.NEXTAUTH_URL || process.env.SITE_URL || 'http://localhost:3000',
  siteUrl: process.env.SITE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000',
  
  // Email Configuration
  fromEmail: process.env.FROM_EMAIL || 'noreply@example.com',
  // Empty unless set — requireAdmin fails closed without ADMIN_EMAIL
  adminEmail: (process.env.ADMIN_EMAIL || '').trim(),
  
  // Branding
  companyName: process.env.COMPANY_NAME || name,
  supportEmail: process.env.SUPPORT_EMAIL || process.env.ADMIN_EMAIL || 'bebetteryou.motivational@gmail.com',
  
  // Metadata
  metadata: {
    title: name,
    description:
      process.env.APP_DESCRIPTION ||
      'Got the motivation? Now grow beyond impossible.',
    keywords: process.env.APP_KEYWORDS || 'motivation, quotes, be better you',
    author: process.env.APP_AUTHOR || name,
    ogImage: process.env.OG_IMAGE || '/brand/logo.png',
  },
  
  // Email Templates
  email: {
    welcome: {
      subject: (appName) => `Welcome to ${appName}!`,
      fromName: (companyName) => companyName || 'Your Company',
    },
    leadNotification: {
      subject: (leadName) => `New Lead: ${leadName}`,
    },
  },
  
  // Dashboard URLs
  dashboardUrl: '/dashboard',
  pricingUrl: '/pricing',

  // Payments (NEXT_PUBLIC_* so client checkout can read defaults)
  paymentProvider: process.env.NEXT_PUBLIC_PAYMENT_PROVIDER || 'stripe',
  stripePrices: {
    starter: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER || '',
    pro:
      process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO ||
      process.env.NEXT_PUBLIC_STRIPE_PRICE_ID ||
      '',
    enterprise:
      process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE ||
      process.env.NEXT_PUBLIC_STRIPE_PRICE_ID ||
      '',
  },

  // Feature Flags — opt-in (off unless ENABLE_* === 'true')
  features: {
    // Blog ships with content, so it is on unless explicitly disabled.
    enableBlog: process.env.NEXT_PUBLIC_ENABLE_BLOG !== 'false',
    // First-party analytics: no third party, no cookies, so it is on by default.
    enableAnalytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS !== 'false',
    enableApiDocs: process.env.ENABLE_API_DOCS === 'true',
    enablePricing:
      process.env.NEXT_PUBLIC_ENABLE_PRICING === 'true' || process.env.ENABLE_PRICING === 'true',
    enablePrintShop: process.env.NEXT_PUBLIC_ENABLE_PRINT_SHOP === 'true',
  },
}

/**
 * Get app name (with fallback)
 */
export function getAppName() {
  return appConfig.name
}

/**
 * Get app description (with fallback)
 */
export function getAppDescription() {
  return appConfig.description
}

/**
 * Get full URL for a path (server-oriented; quote cards use @/libs/site-url in dev).
 */
export function getUrl(path = '') {
  const raw = process.env['SITE_URL'] || process.env['NEXTAUTH_URL'] || 'http://localhost:3000'
  const baseUrl = raw.replace(/\/$/, '')
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${baseUrl}${cleanPath}`
}

export default appConfig

