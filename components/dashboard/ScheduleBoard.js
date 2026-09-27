'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  failedResults,
  formatScheduleWhen,
  manageQuotesHref,
  okCount,
  scheduleFailures,
} from '@/libs/dashboard-ops'
import { toast } from '@/components/dashboard/toast'

export default function ScheduleBoard({ initial = [], postsBySlug: initialPosts = {} }) {
  const [rows, setRows] = useState(initial)
  const [postsBySlug, setPostsBySlug] = useState(initialPosts)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')

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
          nextResults.filter((r) => r.ok).map((r) => [r.id, { ok: true, error: '', manual: false }])
        ),
      }
      const stillOpen = failedResults({ ...row, results: merged }, {
        ...postsBySlug,
        [row.slug]: nextPosts,
      })
      setPostsBySlug((prev) => ({ ...prev, [row.slug]: nextPosts }))
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? {
                ...r,
                results: merged,
                error: stillOpen.map((x) => `${x.id}: ${x.error || 'Failed'}`).join('; '),
              }
            : r
        )
      )
      toast(stillOpen.length ? `Retry: ${stillOpen.map((x) => x.id).join(', ')} still failing` : 'Retry posted')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId('')
    }
  }

  if (!rows.length) {
    return (
      <p className="text-sm text-quiet">
        No schedules yet. Open a quote under Cards and use Schedule, or wait for cron (14:00 UTC).
      </p>
    )
  }

  const pending = rows.filter((r) => r.status === 'pending')
  const failures = scheduleFailures(rows, { postsBySlug })
  const other = rows.filter((r) => r.status !== 'pending')

  return (
    <div className="space-y-8">
      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      {failures.length ? (
        <section className="space-y-3">
          <h2 className="text-[11px] uppercase tracking-[0.2em] text-red-400/90">
            Failures ({failures.length})
          </h2>
          <ul className="divide-y divide-line/40 border border-line border-red-400/20">
            {failures.map((row) => {
              const fails = failedResults(row, postsBySlug)
              return (
                <li key={`fail-${row.id}`} className="space-y-2 px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <Link
                      href={manageQuotesHref({
                        quote: row.slug,
                        retry: fails.map((f) => f.id),
                        section: 'cards',
                      })}
                      className="text-paper underline-offset-2 hover:underline"
                    >
                      {row.slug}
                    </Link>
                    <span className="text-quiet">{formatScheduleWhen(row.runAt)}</span>
                    {okCount(row) ? (
                      <span className="text-quiet">
                        {row.status} ({okCount(row)})
                      </span>
                    ) : (
                      <span className="text-quiet">{row.status}</span>
                    )}
                  </div>
                  {fails.length ? (
                    <ul className="space-y-0.5 text-red-400">
                      {fails.map((f) => (
                        <li key={`${row.id}-${f.id}`}>
                          {f.label || f.id}: {f.error || 'Failed'}
                        </li>
                      ))}
                    </ul>
                  ) : row.error ? (
                    <p className="text-red-400">{row.error}</p>
                  ) : null}
                  <div className="flex flex-wrap gap-4">
                    {fails.length ? (
                      <button
                        type="button"
                        disabled={busyId === row.id}
                        onClick={() => onRetry(row)}
                        className="text-sm text-paper underline-offset-2 hover:underline disabled:opacity-50"
                      >
                        {busyId === row.id ? 'Retrying…' : `Retry failed (${fails.length})`}
                      </button>
                    ) : null}
                    <Link
                      href={manageQuotesHref({
                        quote: row.slug,
                        retry: fails.map((f) => f.id),
                        section: 'cards',
                      })}
                      className="text-sm text-quiet underline-offset-2 hover:underline"
                    >
                      Open in Cards
                    </Link>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      ) : (
        <p className="text-sm text-quiet">No recent network failures.</p>
      )}

      <section className="space-y-3">
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-quiet">
          Upcoming ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-quiet">Nothing pending. Schedule the next quote when ready.</p>
        ) : (
          <ul className="divide-y divide-line/40 border border-line">
            {pending.map((row) => (
              <li
                key={row.id}
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 text-sm">
                  <Link
                    href={manageQuotesHref({ quote: row.slug, section: 'cards' })}
                    className="text-paper underline-offset-2 hover:underline"
                  >
                    {row.slug}
                  </Link>
                  <p className="text-body">{formatScheduleWhen(row.runAt)}</p>
                  <p className="text-quiet">{(row.networks || []).join(', ')}</p>
                </div>
                <button
                  type="button"
                  disabled={busyId === row.id}
                  onClick={() => onCancel(row.id)}
                  className="text-sm text-quiet underline-offset-2 hover:text-paper hover:underline disabled:opacity-50"
                >
                  {busyId === row.id ? '…' : 'Cancel'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {other.length ? (
        <section className="space-y-3">
          <h2 className="text-[11px] uppercase tracking-[0.2em] text-quiet">Recent</h2>
          <ul className="space-y-2 text-sm text-quiet">
            {other.slice(0, 20).map((row) => (
              <li key={row.id}>
                <span className="text-body">{row.status}</span>
                {okCount(row) ? ` (${okCount(row)})` : ''}
                {' · '}
                {row.slug}
                {' · '}
                {formatScheduleWhen(row.runAt)}
                {failedResults(row, postsBySlug).length ? (
                  <span className="text-red-400"> — see Failures</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

function mergeResults(prev = [], next = []) {
  const map = Object.fromEntries((prev || []).map((r) => [r.id, r]))
  for (const r of next || []) map[r.id] = { ...map[r.id], ...r }
  return Object.values(map)
}
