/** Admin dashboard nav — `match(pathname)` drives active state. */
export const adminNav = [
  { href: '/dashboard', label: 'Overview', match: (p) => p === '/dashboard' },
  { href: '/dashboard/analytics', label: 'Analytics', match: (p) => p.startsWith('/dashboard/analytics') },
  { href: '/dashboard/quotes', label: 'Manage', match: (p) => p === '/dashboard/quotes' },
  { href: '/dashboard/quotes/new', label: 'New quote', match: (p) => p.startsWith('/dashboard/quotes/new') },
  { href: '/dashboard/tags', label: 'Tags', match: (p) => p.startsWith('/dashboard/tags') },
  { href: '/dashboard/scripture', label: 'Scripture', match: (p) => p.startsWith('/dashboard/scripture') },
  { href: '/dashboard/print-orders', label: 'Print orders', match: (p) => p.startsWith('/dashboard/print-orders') },
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
