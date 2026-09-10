import appConfig from './app.js'

/** Optional hosted storefront. Print-on-demand on /shop does not need this. */
export const shop = {
  url: process.env.NEXT_PUBLIC_SHOP_URL || '',
  provider: process.env.NEXT_PUBLIC_SHOP_PROVIDER || '',
}

/** Public chrome. Copy for marketing surfaces. */
export const nav = [
  { href: '/quotes', label: 'Quotes' },
  ...(appConfig.features.enableBlog ? [{ href: '/blog', label: 'Blog' }] : []),
  { href: '/shop', label: 'Shop', soon: !(appConfig.features.enablePrintShop || shop.url) },
  ...(appConfig.features.enablePricing ? [{ href: '/pricing', label: 'Pricing' }] : []),
]

export const legal = [
  { href: '/about', label: 'About' },
  { href: '/privacy-policy', label: 'Privacy' },
  { href: '/tos', label: 'Terms' },
]

export const socials = [
  { id: 'instagram', href: 'https://www.instagram.com/be__better__you/', label: 'Instagram' },
  { id: 'linkedin', href: 'https://www.linkedin.com/company/be-better-you', label: 'LinkedIn' },
  { id: 'x', href: 'https://x.com/BeBetterYou3', label: 'X' },
  { id: 'pinterest', href: 'https://www.pinterest.com/bebetteryoumotivational/', label: 'Pinterest' },
  { id: 'youtube', href: 'https://www.youtube.com/@BeBetterYou_Motivational', label: 'YouTube' },
]

export const brand = {
  logo: '/brand/logo.png',
  mark: '/brand/fav.png',
  favicon: '/brand/fav.png',
  // Literal, not appConfig.name — APP_NAME is server-only and would hydrate mismatched.
  name: 'BeBetterYou',
  // The mark already draws the "Be".
  wordmark: 'BetterYou',
}

export const copy = {
  heroLine: 'Be better than yesterday.',
  heroSub: 'Daily quote cards for the days you need a push.',
  aboutTeaser:
    'Daily quote cards for the days you need a push. Built for people who want to be better than yesterday.',
  aboutLead: 'Hey you — yeah, you.',
  newsletterTitle: 'A weekly push.',
  newsletterSub: 'One quote in your inbox. Nothing else.',
  surpriseTitle: 'How do you feel?',
  surpriseSub: 'Pick a mood. We’ll deal one card.',
}
