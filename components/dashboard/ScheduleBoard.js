'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { tabItem, tabList } from '@/components/ui/tabs'
import { postNetworks } from '@/config/social'
import {
  failedResults,
  formatScheduleWhen,
  manageQuotesHref,
  networkStates,
  scheduleFailures,
  slotBadges,
  slotStatus,
} from '@/libs/dashboard-ops'
import { toast } from '@/components/dashboard/toast'

const networkLabels = Object.fromEntries(postNetworks.map((n) => [n.id, n.label]))
const chip = { ok: 'default', failed: 'danger', waiting: 'muted' }
const tabs = [
  ['fix', 'Needs fixing'],
  ['upcoming', 'Upcoming'],
  ['history', 'History'],
]
const empty = {
  fix: 'Nothing failed recently.',
  upcoming: 'Nothing scheduled. Pick an empty day on the calendar to add one.',
  history: 'No posts yet.',
}

/** Queue & history: one list, filtered by tab. Chips show each network's outcome for that post. */
export default function ScheduleBoard({ initial = [], postsBySlug: initialPosts = {}, covers = {} }) {
  const [rows, setRows] = useState(initial)
  const [postsBySlug, setPostsBySlug] = useState(initialPosts)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  /** The server-rendered calendar beside this board re-reads after every change. */
  const router = useRouter()

  async function onCancel(id) {
    if (!window.confirm('Cancel this scheduled post?')) return
    setBusyId(id)
    setError('')
    try {
      const res = await fetch(`/api/social/schedule?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to cancel')
      setRows((prev) => prev.map((row) => (row.id === id ? { ...row, status: 'canceled' } : row)))
      toast('Schedule canceled')
      router.refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId('')
    }
  }

  async function onRetry(row) {
    const nets = failedResults(row, postsBySlug).map((f) => f.id)
    if (!nets.length) return
    setBusyId(row.id)
    setError('')
    try {
      const res = await fetch('/api/social/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: row.slug, networks: nets }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Retry failed')
      const nextResults = data.results || []
      const merged = mergeResults(row.results, nextResults)
      const nextPosts = {
        ...(postsBySlug[row.slug] || {}),
        ...Object.fromEntries(
          nextResults.filter((r) => r.ok).map((r) => [r.id, { ok: true, error: '', manual: false }]),
        ),
      }
      const stillOpen = failedResults(
        { ...row, results: merged },
        {
          ...postsBySlug,
          [row.slug]: nextPosts,
        },
      )
      setPostsBySlug((prev) => ({ ...prev, [row.slug]: nextPosts }))
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? {
                ...r,
                results: merged,
                error: stillOpen.map((x) => `${x.id}: ${x.error || 'Failed'}`).join('; '),
              }
            : r,
        ),
      )
      toast(
        stillOpen.length ? `Retry: ${stillOpen.map((x) => x.id).join(', ')} still failing` : 'Retry posted',
      )
      router.refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId('')
    }
  }

  const now = Date.now()
  const lists = {
    fix: scheduleFailures(rows, { postsBySlug }),
    upcoming: rows
      .filter((r) => r.status === 'pending')
      .sort((x, y) => Date.parse(x.runAt) - Date.parse(y.runAt)),
    history: rows
      .filter((r) => r.status !== 'pending')
      .sort((x, y) => Date.parse(y.runAt) - Date.parse(x.runAt)),
  }
  const [tab, setTab] = useState(lists.fix.length ? 'fix' : 'upcoming')
  const [shown, setShown] = useState(10)
  const list = lists[tab]

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <div className={tabList} role="tablist">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={tabItem(tab === id)}
            >
              {label} ({lists[id].length})
            </button>
          ))}
        </div>
      </div>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      {list.length ? (
        <ul className="divide-y divide-border">
          {list.slice(0, tab === 'history' ? shown : undefined).map((row) => {
            const nets = networkStates(row, postsBySlug)
            const failed = nets.filter((n) => n.state === 'failed')
            const [variant, label] = slotBadges[slotStatus(row, now, postsBySlug)] || ['muted', row.status]
            const href = manageQuotesHref({
              quote: row.slug,
              section: 'cards',
              retry: failed.map((n) => n.id),
            })
            return (
              <li key={row.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                <Link href={href} className="flex min-w-0 flex-1 items-center gap-3 hover:text-foreground">
                  {covers[row.slug] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={covers[row.slug]}
                      alt=""
                      loading="lazy"
                      className="size-10 shrink-0 rounded object-cover"
                    />
                  ) : null}
                  <span className="min-w-0">
                    <span className="block text-foreground">{row.slug}</span>
                    <span className="block text-xs text-muted-foreground">
                      {formatScheduleWhen(row.runAt)}
                    </span>
                  </span>
                </Link>
                <span className="flex flex-wrap gap-1">
                  {nets.map((n) => (
                    <Badge key={n.id} variant={chip[n.state]} title={n.error || undefined}>
                      {networkLabels[n.id] || n.id}
                    </Badge>
                  ))}
                </span>
                <Badge variant={variant}>{label}</Badge>
                {/* Fixed-width action slot keeps status badges in one column. */}
                <span className="flex justify-end sm:w-24">
                  {tab === 'upcoming' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busyId === row.id}
                      onClick={() => onCancel(row.id)}
                    >
                      {busyId === row.id ? 'Canceling…' : 'Cancel'}
                    </Button>
                  ) : failed.length ? (
                    <Button size="sm" disabled={busyId === row.id} onClick={() => onRetry(row)}>
                      {busyId === row.id ? 'Retrying…' : `Retry ${failed.length}`}
                    </Button>
                  ) : null}
                </span>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{empty[tab]}</p>
      )}

      {tab === 'history' && list.length > shown ? (
        <Button variant="ghost" size="sm" onClick={() => setShown((n) => n + 10)}>
          Show more
        </Button>
      ) : null}
    </div>
  )
}

function mergeResults(prev = [], next = []) {
  const map = Object.fromEntries((prev || []).map((r) => [r.id, r]))
  for (const r of next || []) map[r.id] = { ...map[r.id], ...r }
  return Object.values(map)
}
