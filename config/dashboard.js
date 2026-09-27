import appConfig from '@/config/app'

/** Admin dashboard nav — `match(pathname)` drives active state. */
export const adminNav = [
  {
    href: '/dashboard',
    label: 'Overview',
    match: (p) => p === '/dashboard',
  },
  {
    href: '/dashboard?range=30d#analytics',
    label: 'Analytics',
    match: (p) => p === '/dashboard' || p.startsWith('/dashboard/analytics'),
    analytics: true,
  },
  {
    href: '/dashboard/quotes',
    label: 'Quotes',
    match: (p) =>
      p === '/dashboard/quotes' ||
      p.startsWith('/dashboard/quotes/') ||
      p.startsWith('/dashboard/schedules'),
  },
  {
    href: '/dashboard/tags',
    label: 'Tags',
    match: (p) => p.startsWith('/dashboard/tags') || p.startsWith('/dashboard/scripture'),
  },
  { href: '/dashboard/print-orders', label: 'Print', match: (p) => p.startsWith('/dashboard/print-orders') },
  { href: '/dashboard/subscribers', label: 'Subscribers', match: (p) => p.startsWith('/dashboard/subscribers') },
  ...(appConfig.features.enablePractice
    ? [{ href: '/dashboard/practice', label: 'Practice', match: (p) => p.startsWith('/dashboard/practice') }]
    : []),
]

/** Overview shortcut cards — keep in sync with admin areas. */
export const adminActions = [
  { href: '/dashboard/quotes', title: 'Quotes', body: 'Cards, schedules, week review, and posting.' },
  { href: '/dashboard/tags', title: 'Tags & scripture', body: 'Mood labels and tradition passages.' },
  { href: '/dashboard/subscribers', title: 'Subscribers', body: 'Newsletter list, digests, and send failures.' },
  { href: '/dashboard/print-orders', title: 'Print orders', body: 'Quote print orders and Printful status.' },
  {
    href: '/dashboard?range=30d#analytics',
    title: 'Analytics',
    body: 'Channels, top pages, downloads and shares.',
  },
  { href: '/', title: 'View site', body: 'Open the public homepage.' },
]

export function filterQuotes(quotes, { q = '', tag = '' } = {}) {
  const needle = q.trim().toLowerCase()
  return quotes.filter((quote) => {
    if (tag && !quote.tags?.includes(tag)) return false
    if (!needle) return true
    const hay = [quote.text, quote.author, String(quote.n), quote.slug].filter(Boolean).join(' ').toLowerCase()
    return hay.includes(needle)
  })
}
