import appConfig from '@/config/app'

const under = (...roots) => (p) => roots.some((r) => p === r || p.startsWith(`${r}/`))

/** Sidebar / bottom-bar sections — `icon` is a key into the Nav icon map. */
export const adminNav = [
  { href: '/dashboard', label: 'Today', icon: 'today', match: (p) => p === '/dashboard' },
  { href: '/dashboard/quotes', label: 'Content', icon: 'content', match: under('/dashboard/quotes', '/dashboard/schedules') },
  { href: '/dashboard/subscribers', label: 'Audience', icon: 'audience', match: under('/dashboard/subscribers') },
  { href: '/dashboard/print-orders', label: 'Shop', icon: 'shop', match: under('/dashboard/print-orders') },
  { href: '/dashboard/analytics', label: 'Insights', icon: 'insights', match: under('/dashboard/analytics') },
  {
    href: '/dashboard/integrations',
    label: 'Settings',
    icon: 'settings',
    match: under('/dashboard/integrations', '/dashboard/tags', '/dashboard/scripture', '/dashboard/practice'),
  },
]

/** In-page tabs. Same-page tabs share one `?section=` param, so old deep links keep working. */
const sections = (path, items) => items.map(([id, label]) => ({ id, label, href: `${path}?section=${id}` }))

export const contentTabs = sections('/dashboard/quotes', [
  ['schedules', 'Calendar'],
  ['cards', 'Cards'],
  ['new', 'New quote'],
  ['week', 'Week review'],
])

export const audienceTabs = sections('/dashboard/subscribers', [
  ['list', 'Subscribers'],
  ['sends', 'Sends'],
  ['tools', 'Tools'],
])

export const settingsTabs = [
  { id: 'integrations', label: 'Integrations', href: '/dashboard/integrations' },
  { id: 'tags', label: 'Tags', href: '/dashboard/tags' },
  { id: 'scripture', label: 'Scripture', href: '/dashboard/tags?section=scripture' },
  ...(appConfig.features.enablePractice ? [{ id: 'practice', label: 'Practice', href: '/dashboard/practice' }] : []),
]

/** Requested tab, else the fallback — unknown ids never blank a page. */
export const pickTab = (tabs, id, fallback = tabs[0].id) => (tabs.some((t) => t.id === id) ? id : fallback)

export function filterQuotes(quotes, { q = '', tag = '' } = {}) {
  const needle = q.trim().toLowerCase()
  return quotes.filter((quote) => {
    if (tag && !quote.tags?.includes(tag)) return false
    if (!needle) return true
    const hay = [quote.text, quote.author, String(quote.n), quote.slug].filter(Boolean).join(' ').toLowerCase()
    return hay.includes(needle)
  })
}
