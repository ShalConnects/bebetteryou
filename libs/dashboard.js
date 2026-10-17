import { appConfig } from '@/config/app'
import { rangeStart, summarize } from '@/libs/analytics'
import { analyticsReady, listEvents } from '@/libs/analytics-store'
import { logError } from '@/libs/logger'
import { subscriberCounts } from '@/libs/newsletter'
import { presentPrintOrder } from '@/libs/print-format'
import { listOrders, printOrdersReady } from '@/libs/print-orders'
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

/** One overview panel failing (Mongo down, analytics off) must not blank the page. */
async function settle(label, run, fallback) {
  try {
    return await run()
  } catch (error) {
    logError(`Dashboard overview: ${label} unavailable`, error)
    return fallback
  }
}

const ordersToAct = async () =>
  printOrdersReady()
    ? (await listOrders(50)).map(presentPrintOrder).filter((o) => o.canMarkPaid || o.canFulfill)
    : []

const weekVisitors = async () =>
  appConfig.features.enableAnalytics && analyticsReady()
    ? summarize(await listEvents({ since: rangeStart(7) }), { days: 7 }).totals.visitors
    : null

export async function adminOverview(quotes) {
  const [stats, social, schedules, orders, subscribers, visitors] = await Promise.all([
    quoteStats(quotes),
    readyNetworks(),
    listAllSchedules({ limit: 100 }),
    settle('print orders', ordersToAct, []),
    settle('subscribers', subscriberCounts, null),
    settle('analytics', weekVisitors, null),
  ])
  const postsBySlug = await readPostsBySlugs(schedules.map((s) => s.slug))
  const failures = scheduleFailures(schedules, { postsBySlug })
  return {
    stats: { ...stats, subscribers, visitors },
    social,
    schedules,
    networkActivity: networkLastActivity(schedules),
    attention: {
      failures,
      orders,
      upcoming: upcomingPending(schedules, 3),
      pendingSocial: social.filter((n) => n.pending),
    },
  }
}
