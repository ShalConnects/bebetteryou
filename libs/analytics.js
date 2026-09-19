/**
 * Pure summaries over raw analytics events. No database, no React — the store
 * hands over rows and this turns them into the numbers the dashboard renders,
 * which also makes every panel unit-testable.
 */
import { analyticsEvents, channelLabels, shareTargetLabels, topListSize } from '@/config/analytics'

/** UTC day buckets, so a server and a browser in different zones agree. */
export function dayKey(value) {
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
}

/** Midnight UTC, `days - 1` days back, so a 7-day range includes today. */
export function rangeStart(days, now = Date.now()) {
  const start = new Date(now)
  start.setUTCHours(0, 0, 0, 0)
  start.setUTCDate(start.getUTCDate() - (Math.max(1, days) - 1))
  return start
}

export function dayKeys(days, now = Date.now()) {
  const start = rangeStart(days, now)
  return Array.from({ length: Math.max(1, days) }, (_, i) => {
    const date = new Date(start)
    date.setUTCDate(date.getUTCDate() + i)
    return dayKey(date)
  })
}

function emptyRow(key, label) {
  return { key, label, visitors: new Set(), pageviews: 0, downloads: 0, shares: 0 }
}

function addEvent(row, event) {
  if (event.visitor) row.visitors.add(event.visitor)
  if (event.name === analyticsEvents.pageview) row.pageviews += 1
  else if (event.name === analyticsEvents.download) row.downloads += 1
  else if (event.name === analyticsEvents.share) row.shares += 1
}

function settle(row) {
  return { ...row, visitors: row.visitors.size }
}

function emptyPractice() {
  return { viewed: 0, started: 0, completed: 0, plans: 0, planDone: 0, saves: 0, shares: 0 }
}

function addPractice(counts, event) {
  const { name } = event
  if (name === analyticsEvents.motivationViewed) counts.viewed += 1
  else if (name === analyticsEvents.actionStarted) counts.started += 1
  else if (name === analyticsEvents.actionCompleted) counts.completed += 1
  else if (name === analyticsEvents.planCreated) counts.plans += 1
  else if (name === analyticsEvents.planCompleted) counts.planDone += 1
  else if (name === analyticsEvents.itemSaved) counts.saves += 1
  else if (name === analyticsEvents.itemShared) counts.shares += 1
}

/** Group events by a derived key, dropping rows whose key is empty. */
function group(events, keyFn, labelFn = (key) => key) {
  const rows = new Map()
  for (const event of events) {
    const key = keyFn(event)
    if (!key) continue
    if (!rows.has(key)) rows.set(key, emptyRow(key, labelFn(key)))
    addEvent(rows.get(key), event)
  }
  return rows
}

function rank(rows, metric, limit = topListSize) {
  return [...rows.values()]
    .map(settle)
    .filter((row) => row[metric] > 0)
    .sort((a, b) => b[metric] - a[metric] || a.key.localeCompare(b.key))
    .slice(0, limit)
}

/** Rounded to one decimal — a download rate of 0 reads as "nobody saved one". */
function perVisitor(count, visitors) {
  if (!visitors) return 0
  return Math.round((count / visitors) * 1000) / 10
}

export function summarize(events = [], { days = 30, now = Date.now() } = {}) {
  const keys = dayKeys(days, now)
  const first = keys[0]
  const inRange = events.filter((event) => {
    const key = dayKey(event.createdAt)
    return key && key >= first
  })

  const totals = emptyRow('all', 'All')
  for (const event of inRange) addEvent(totals, event)

  const perDay = group(inRange, (event) => dayKey(event.createdAt))
  const daily = keys.map((key) => {
    const row = perDay.get(key)
    return row ? settle(row) : { key, label: key, visitors: 0, pageviews: 0, downloads: 0, shares: 0 }
  })

  const channelRows = group(
    inRange,
    (event) => event.channel || 'direct',
    (key) => channelLabels[key] || key
  )
  const sourceRows = group(inRange, (event) => event.source || '')
  const pageRows = group(inRange, (event) =>
    event.name === analyticsEvents.pageview ? event.path || '' : ''
  )
  const quoteRows = group(inRange, (event) => event.slug || '')
  const shareRows = group(
    inRange,
    (event) => (event.name === analyticsEvents.share ? event.target || 'other' : ''),
    (key) => shareTargetLabels[key] || key
  )

  const settled = settle(totals)
  const practice = emptyPractice()
  for (const event of inRange) addPractice(practice, event)

  return {
    days,
    from: first,
    to: keys[keys.length - 1],
    totals: {
      ...settled,
      downloadRate: perVisitor(settled.downloads, settled.visitors),
    },
    practice,
    daily,
    /** Every channel that sent someone, ranked — the "what is working" list. */
    channels: rank(channelRows, 'visitors', channelRows.size),
    sources: rank(sourceRows, 'visitors'),
    pages: rank(pageRows, 'pageviews'),
    quotes: rank(quoteRows, 'downloads'),
    shareTargets: rank(shareRows, 'shares'),
  }
}

/** Bar widths as a percentage of the busiest row, floored so 1 stays visible. */
export function barWidths(rows, metric) {
  const max = rows.reduce((top, row) => Math.max(top, row[metric] || 0), 0)
  return rows.map((row) => (max ? Math.max(2, Math.round(((row[metric] || 0) / max) * 100)) : 0))
}
