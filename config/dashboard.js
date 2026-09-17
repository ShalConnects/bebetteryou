/** Admin dashboard nav — `match(pathname)` drives active state. */
export const adminNav = [
  {
    href: '/dashboard',
    label: 'Overview',
    match: (p) => p === '/dashboard' || p.startsWith('/dashboard/analytics'),
  },
  {
    href: '/dashboard/quotes',
    label: 'Manage',
    match: (p) =>
      p === '/dashboard/quotes' ||
      p.startsWith('/dashboard/quotes/') ||
      p.startsWith('/dashboard/schedules'),
  },
  {
    href: '/dashboard/tags',
    label: 'Tags & scripture',
    match: (p) => p.startsWith('/dashboard/tags') || p.startsWith('/dashboard/scripture'),
  },
  { href: '/dashboard/print-orders', label: 'Print orders', match: (p) => p.startsWith('/dashboard/print-orders') },
  { href: '/dashboard/subscribers', label: 'Subscribers', match: (p) => p.startsWith('/dashboard/subscribers') },
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
