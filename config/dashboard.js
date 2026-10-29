import appConfig from '@/config/app'

/** Admin dashboard nav — `match(pathname)` drives active state. */
export const adminNav = [
  {
    href: '/dashboard',
    label: 'Overview',
    match: (p) => p === '/dashboard',
  },
  { href: '/dashboard/analytics', label: 'Analytics', match: (p) => p.startsWith('/dashboard/analytics') },
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
  {
    href: '/dashboard/integrations',
    label: 'Integrations',
    match: (p) => p.startsWith('/dashboard/integrations'),
  },
  ...(appConfig.features.enablePractice
    ? [{ href: '/dashboard/practice', label: 'Practice', match: (p) => p.startsWith('/dashboard/practice') }]
    : []),
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
