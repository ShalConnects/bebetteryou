import { readyNetworks } from '@/libs/social'
import { readPostsBySlugs } from '@/libs/social/post-store'
import { listAllSchedules } from '@/libs/social/schedule-store'
import {
  networkLastActivity,
  scheduleFailures,
  upcomingPending,
} from '@/libs/dashboard-ops'
import { nextQuoteN } from './quotes-store'
import { readTags, tagNames } from './tags-store'

export async function quoteStats(quotes) {
  const total = quotes.length
  const latest = quotes.reduce((max, q) => Math.max(max, q.n), 0)
  const catalog = tagNames(await readTags())
  const tagCounts = Object.fromEntries(
    catalog.map((tag) => [tag, quotes.filter((q) => q.tags?.includes(tag)).length])
  )
  return { total, latest, next: nextQuoteN(quotes), tagCounts }
}

export async function adminOverview(quotes) {
  const [stats, social, schedules] = await Promise.all([
    quoteStats(quotes),
    readyNetworks(),
    listAllSchedules({ limit: 100 }),
  ])
  const postsBySlug = await readPostsBySlugs(schedules.map((s) => s.slug))
  const failures = scheduleFailures(schedules, { postsBySlug })
  return {
    stats,
    social,
    schedules,
    networkActivity: networkLastActivity(schedules),
    attention: {
      failures,
      upcoming: upcomingPending(schedules, 3),
      pendingSocial: social.filter((n) => n.pending),
    },
  }
}
