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
  ...(appConfig.features.enableBooks ? [{ href: '/books', label: 'Books' }] : []),
  { href: '/shop', label: 'Shop', soon: !(appConfig.features.enablePrintShop || shop.url) },
  ...(appConfig.features.enablePricing ? [{ href: '/pricing', label: 'Pricing' }] : []),
]

export const legal = [
  { href: '/about', label: 'About' },
  { href: '/privacy-policy', label: 'Privacy' },
  { href: '/tos', label: 'Terms' },
]

/** Other products from the same maker (footer). */
export const makerProducts = [
  { name: 'BadgeMilestone', href: 'https://www.badgemilestone.app/' },
  { name: 'Balanze', href: 'https://balanze.cash/' },
  { name: 'Screen Time', href: 'https://play.google.com/store/apps/details?id=com.screentime.overlay' },
  { name: 'Dynamic Variations', href: 'https://wordpress.org/plugins/dynamic-variation-images/' },
]

export const socials = [
  { id: 'instagram', href: 'https://www.instagram.com/be__better__you/', label: 'Instagram' },
  { id: 'threads', href: 'https://www.threads.net/@be__better__you', label: 'Threads' },
  { id: 'linkedin', href: 'https://www.linkedin.com/company/be-better-you', label: 'LinkedIn' },
  { id: 'x', href: 'https://x.com/BeBetterYou3', label: 'X' },
  { id: 'pinterest', href: 'https://www.pinterest.com/bebetteryoumotivational/', label: 'Pinterest' },
  { id: 'youtube', href: 'https://www.youtube.com/@BeBetterYou_Motivational', label: 'YouTube' },
  { id: 'bluesky', href: 'https://bsky.app/profile/bebetteryou.bsky.social', label: 'Bluesky' },
]

const mark = '/brand/fav.png'

export const brand = {
  logo: '/brand/logo.png',
  mark,
  favicon: mark,
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
  newsletterTitle: 'Stay in the loop.',
  newsletterSub: 'Quote cards when we post — plus blog and book notes if you want them.',
  surpriseTitle: 'How do you feel?',
  surpriseSub: 'Pick a mood. We’ll deal one card.',
}
