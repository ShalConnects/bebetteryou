/** Shared schedule/ops helpers for admin dashboard (pure). */

/** Failures still open — hide networks that later succeeded for this slug (post log). */
export function failedResults(row, postsBySlug) {
  const fails = (row?.results || []).filter((r) => r && r.ok === false)
  if (!postsBySlug) return fails
  const posts = postsBySlug[row.slug] || {}
  return fails.filter((r) => !posts[r.id]?.ok)
}

export function okCount(row) {
  const list = row?.results || []
  if (!list.length) return null
  return `${list.filter((r) => r?.ok).length}/${list.length}`
}

export function isScheduleFailure(row, postsBySlug) {
  if (!row) return false
  if (failedResults(row, postsBySlug).length > 0) return true
  if (row.status !== 'failed') return false
  const nets = row.networks || []
  if (!postsBySlug || !nets.length) return true
  const posts = postsBySlug[row.slug] || {}
  return nets.some((id) => !posts[id]?.ok)
}

export function scheduleFailures(rows, { days = 21, postsBySlug } = {}) {
  const since = Date.now() - days * 86_400_000
  return (rows || []).filter((r) => {
    if (!isScheduleFailure(r, postsBySlug)) return false
    if (!r.runAt) return true
    return new Date(r.runAt).getTime() >= since
  })
}

export function upcomingPending(rows, limit = 3) {
  return (rows || [])
    .filter((r) => r.status === 'pending')
    .sort((a, b) => new Date(a.runAt) - new Date(b.runAt))
    .slice(0, limit)
}

/** Latest cron result per network from schedule rows. */
export function networkLastActivity(rows) {
  const map = {}
  for (const row of rows || []) {
    const at = row.runAt || row.updatedAt || row.createdAt
    if (!at) continue
    for (const r of row.results || []) {
      if (!r?.id) continue
      const prev = map[r.id]
      if (prev && new Date(prev.at) >= new Date(at)) continue
      map[r.id] = {
        ok: Boolean(r.ok),
        at,
        error: r.error || '',
        slug: row.slug,
      }
    }
  }
  return map
}

export function formatScheduleWhen(iso) {
  if (!iso) return '—'
  try {
    return `${new Date(iso).toLocaleString(undefined, {
      weekday: 'short',
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'UTC',
    })} UTC`
  } catch {
    return iso
  }
}

/** Deep-link into Manage quotes (cards + optional retry networks). */
export function manageQuotesHref({ quote, retry, section } = {}) {
  const q = new URLSearchParams()
  if (quote) q.set('quote', quote)
  if (retry) q.set('retry', Array.isArray(retry) ? retry.filter(Boolean).join(',') : String(retry))
  if (section) q.set('section', section)
  const s = q.toString()
  return s ? `/dashboard/quotes?${s}` : '/dashboard/quotes'
}
