import { appConfig } from '@/config/app'
import { rangeStart } from '@/libs/analytics'
import { analyticsReady, countVisitors } from '@/libs/analytics-store'
import { logError } from '@/libs/logger'
import { subscriberCounts } from '@/libs/newsletter'
import { presentPrintOrder } from '@/libs/print-format'
import { listOrders, printOrdersReady } from '@/libs/print-orders'
import { cachedReadyNetworks } from '@/libs/social/status-cache'
import { readPostsBySlugs } from '@/libs/social/post-store'
import { countYoutubeShortsBacklog } from '@/libs/social/run-daily-youtube-short'
import { listAllSchedules } from '@/libs/social/schedule-store'
import {
  networkLastActivity,
  scheduleFailures,
  upcomingPending,
} from '@/libs/dashboard-ops'
import { nextQuoteN } from './quotes-store'

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

/** This week's and last week's unique visitors, for the stat and its trend. */
async function weekVisitors() {
  if (!appConfig.features.enableAnalytics || !analyticsReady()) return null
  const start = rangeStart(7)
  const [now, prev] = await Promise.all([countVisitors(start), countVisitors(rangeStart(14), start)])
  return { now, prev }
}


export async function adminOverview(quotes) {
  const [stats, social, schedules, orders, subscribers, visitors] = await Promise.all([
    { total: quotes.length, next: nextQuoteN(quotes) },
    settle('social networks', cachedReadyNetworks, []),
    listAllSchedules({ limit: 100 }),
    settle('print orders', ordersToAct, []),
    settle('subscribers', subscriberCounts, null),
    settle('analytics', weekVisitors, null),
  ])
  const scheduleSlugs = schedules.map((s) => s.slug)
  const quoteSlugs = quotes.map((q) => q.slug).filter(Boolean)
  const postsBySlug = await readPostsBySlugs([...new Set([...scheduleSlugs, ...quoteSlugs])])
  const failures = scheduleFailures(schedules, { postsBySlug })
  return {
    stats: { ...stats, subscribers, visitors },
    social,
    schedules,
    postsBySlug,
    networkActivity: networkLastActivity(schedules),
    attention: {
      failures,
      orders,
      upcoming: upcomingPending(schedules, 3),
      pendingSocial: social.filter((n) => n.pending),
      shortsBacklog: countYoutubeShortsBacklog(quotes, postsBySlug),
    },
  }
}
