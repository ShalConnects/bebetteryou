import appConfig from './app.js'
import { heroLine, heroSub } from './pitch.js'

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
  { id: 'facebook', href: 'https://www.facebook.com/profile.php?id=100083130852497', label: 'Facebook' },
  { id: 'linkedin', href: 'https://www.linkedin.com/company/be-better-you', label: 'LinkedIn' },
  { id: 'x', href: 'https://x.com/BeBetterYou3', label: 'X' },
  { id: 'pinterest', href: 'https://www.pinterest.com/bebetteryoumotivational/', label: 'Pinterest' },
  { id: 'youtube', href: 'https://www.youtube.com/@BeBetterYou_Motivational', label: 'YouTube' },
  { id: 'bluesky', href: 'https://bsky.app/profile/bebetteryou.bsky.social', label: 'Bluesky' },
  { id: 'telegram', href: 'https://t.me/BeBetterYou_Motivational', label: 'Telegram' },
]

/** Homepage hero background loop (silent; desktop only — see HeroVideo). */
export const heroVideo = { src: '/hero/loop.mp4', poster: '/hero/loop.jpg' }

const mark = '/brand/fav.png'

export const brand = {
  mark,
  favicon: mark,
  // Literal, not appConfig.name — APP_NAME is server-only and would hydrate mismatched.
  name: 'BeBetterYou',
  // The mark already draws the "Be".
  wordmark: 'BetterYou',
}

export const copy = {
  heroLine,
  heroSub,
  aboutTeaser:
    'Quote cards every day on the site and where you follow us. Built for people who want to be better than yesterday.',
  aboutLead: 'Hey you — yeah, you.',
  newsletterTitle: 'Stay in the loop.',
  newsletterSub: 'Quote card roundups when we send them — plus blog and book notes if you want them.',
  surpriseTitle: 'How do you feel?',
  surpriseSub: 'Pick a mood. We’ll deal one card.',
  homeDeckTitle: 'The deck',
  homeDeckAll: 'See all cards',
  homeReadTitle: 'Read deeper',
  wearKicker: 'The shop',
  wearTitle: { tee: 'This one, on a tee.', mug: 'This one, on a mug.' },
  wearSub: 'Printed when you order — nothing sitting in a warehouse.',
  wearCta: 'Make this one',
  homePrintTitle: 'Want one on a tee or mug?',
  homePrintSub: 'Print a quote when you order — nothing sitting in a warehouse.',
  homePrintCta: 'Browse the shop',
  shopOwnTitle: 'Your words, on a tee.',
  shopOwnSub: 'Write a line, pick tee or mug, and we print just that one.',
  notFoundTitle: 'Wrong turn.',
  notFoundSub: 'Here’s a card while you’re here. Still counts as moving.',
}
