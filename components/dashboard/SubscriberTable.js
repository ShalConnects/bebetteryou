'use client'

import { useCallback, useRef, useState } from 'react'

function prefLabel(prefs = {}) {
  const bits = []
  if (prefs.quotes) bits.push('quotes')
  if (prefs.blog) bits.push('blog')
  if (prefs.books) bits.push('books')
  return bits.length ? bits.join(', ') : 'none'
}

function joinedLabel(createdAt) {
  if (!createdAt) return '—'
  return new Date(createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function unsubscribedLabel(unsubscribedAt) {
  if (!unsubscribedAt) return null
  return new Date(unsubscribedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200]

function syncUrl({ page, status, pageSize }) {
  if (typeof window === 'undefined') return
  const params = new URLSearchParams()
  if (status && status !== 'all') params.set('status', status)
  if (page && page > 1) params.set('page', String(page))
  if (pageSize && pageSize !== 50) params.set('pageSize', String(pageSize))
  const q = params.toString()
  const next = q ? `/dashboard/subscribers?${q}` : '/dashboard/subscribers'
  window.history.replaceState(null, '', next)
}

export default function SubscriberTable({
  subscribers: initial,
  page: initialPage = 1,
  pageSize: initialPageSize = 50,
  totalPages: initialTotalPages = 1,
  filteredTotal: initialFilteredTotal = 0,
  status: initialStatus = 'all',
  activeCount: initialActiveCount = 0,
  unsubscribedCount: initialUnsubscribedCount = 0,
  totalCount: initialTotalCount = 0,
}) {
  const [rows, setRows] = useState(initial)
  const [page, setPage] = useState(initialPage)
  const [pageSize, setPageSize] = useState(initialPageSize)
  const [totalPages, setTotalPages] = useState(initialTotalPages)
  const [filteredTotal, setFilteredTotal] = useState(initialFilteredTotal)
  const [status, setStatus] = useState(initialStatus)
  const [activeCount, setActiveCount] = useState(initialActiveCount)
  const [unsubscribedCount, setUnsubscribedCount] = useState(initialUnsubscribedCount)
  const [totalCount, setTotalCount] = useState(initialTotalCount)
  const [busyEmail, setBusyEmail] = useState('')
  const [copiedEmail, setCopiedEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const reqId = useRef(0)
  const copyTimer = useRef(null)

  async function onCopyEmail(email) {
    try {
      await navigator.clipboard.writeText(email)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      setCopiedEmail(email)
      copyTimer.current = setTimeout(() => setCopiedEmail(''), 1500)
    } catch {
      setError('Could not copy email')
    }
  }

  const loadPage = useCallback(async (nextPage, nextStatus, nextPageSize) => {
    const id = ++reqId.current
    setError('')
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        pageSize: String(nextPageSize),
        status: nextStatus,
      })
      const res = await fetch(`/api/newsletter/subscribers?${params}`, {
        credentials: 'same-origin',
        cache: 'no-store',
      })
      const data = await res.json().catch(() => ({}))
      if (id !== reqId.current) return
      if (!res.ok) throw new Error(data.error || `Failed to load (${res.status})`)

      setRows(data.subscribers || [])
      setPage(data.page)
      setPageSize(data.pageSize)
      setTotalPages(data.totalPages)
      setFilteredTotal(data.filteredTotal)
      setStatus(data.status)
      setActiveCount(data.activeCount)
      setUnsubscribedCount(data.unsubscribedCount)
      setTotalCount(data.totalCount)
      syncUrl({ page: data.page, status: data.status, pageSize: data.pageSize })
    } finally {
      if (id === reqId.current) setLoading(false)
    }
  }, [])

  async function goTo(nextPage, nextStatus = status, nextPageSize = pageSize) {
    try {
      await loadPage(nextPage, nextStatus, nextPageSize)
    } catch (err) {
      setError(err.message)
    }
  }

  function onPageSizeChange(event) {
    const next = Number.parseInt(event.target.value, 10)
    if (!Number.isFinite(next) || next === pageSize) return
    goTo(1, status, next)
  }

  async function onUnsubscribe(email) {
    if (!window.confirm(`Unsubscribe ${email}? They stay on the list but won’t get mail.`)) return
    setBusyEmail(email)
    setError('')
    try {
      const res = await fetch('/api/newsletter/subscriber', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setRows((prev) =>
        prev.map((row) =>
          row.email === email
            ? {
                ...row,
                unsubscribedAt: new Date().toISOString(),
                prefs: data.prefs || { quotes: false, blog: false, books: false },
              }
            : row
        )
      )
      await loadPage(page, status, pageSize)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyEmail('')
    }
  }

  const filters = [
    { id: 'all', label: 'All', count: totalCount },
    { id: 'active', label: 'Active', count: activeCount },
    { id: 'unsubscribed', label: 'Unsubscribed', count: unsubscribedCount },
  ]

  const from = filteredTotal === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, filteredTotal)
  const canPrev = !loading && page > 1
  const canNext = !loading && page < totalPages

  return (
    <div className={`space-y-4 ${loading ? 'opacity-70' : ''}`}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {filters.map((f) => {
          const active = status === f.id
          return (
            <button
              key={f.id}
              type="button"
              disabled={loading || active}
              onClick={() => goTo(1, f.id)}
              className={`text-[11px] uppercase tracking-[0.2em] transition-colors disabled:cursor-default ${
                active ? 'text-accent' : 'text-quiet hover:text-paper'
              }`}
            >
              {f.label} ({f.count})
            </button>
          )
        })}
      </div>

      <p className="text-sm text-quiet">
        Unsubscribed addresses stay on this list with status marked — they are skipped by quote/digest
        sends. Filter with <span className="text-paper">Unsubscribed</span> to review them.
      </p>

      {!rows.length ? (
        <p className="text-sm text-quiet">
          {status === 'unsubscribed'
            ? 'No unsubscribed emails.'
            : status === 'active'
              ? 'No active subscribers.'
              : 'No subscribers yet.'}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-[0.2em] text-quiet">
                <th className="pb-3 pr-4 font-normal">Email</th>
                <th className="pb-3 pr-4 font-normal">Prefs</th>
                <th className="pb-3 pr-4 font-normal">Status</th>
                <th className="pb-3 pr-4 font-normal">Joined</th>
                <th className="pb-3 font-normal"> </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const off = Boolean(row.unsubscribedAt)
                const when = unsubscribedLabel(row.unsubscribedAt)
                return (
                  <tr
                    key={row.email}
                    className={`border-t border-line/40 ${off ? 'opacity-70' : ''}`}
                  >
                    <td className={`py-3 pr-4 ${off ? 'text-quiet' : 'text-paper'}`}>
                      <span className="group/email inline-flex items-center gap-1.5">
                        <span>{row.email}</span>
                        <button
                          type="button"
                          className={`inline-flex text-quiet transition-opacity hover:text-paper focus-visible:opacity-100 group-hover/email:opacity-100 ${
                            copiedEmail === row.email ? 'opacity-100' : 'opacity-0'
                          }`}
                          aria-label={copiedEmail === row.email ? 'Copied' : 'Copy email'}
                          onClick={() => onCopyEmail(row.email)}
                        >
                          {copiedEmail === row.email ? (
                            <svg
                              viewBox="0 0 24 24"
                              width="14"
                              height="14"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              aria-hidden
                            >
                              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          ) : (
                            <svg
                              viewBox="0 0 24 24"
                              width="14"
                              height="14"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              aria-hidden
                            >
                              <rect x="9" y="9" width="11" height="11" rx="1.5" />
                              <path d="M5 15V5.5A1.5 1.5 0 0 1 6.5 4H15" strokeLinecap="round" />
                            </svg>
                          )}
                        </button>
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-quiet">{prefLabel(row.prefs)}</td>
                    <td className="py-3 pr-4">
                      {off ? (
                        <span className="text-red-400/90">
                          Unsubscribed
                          {when ? (
                            <span className="mt-0.5 block text-xs text-quiet">on {when}</span>
                          ) : null}
                        </span>
                      ) : (
                        <span className="text-accent">Active</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-quiet">{joinedLabel(row.createdAt)}</td>
                    <td className="py-3 text-right">
                      {off ? (
                        <span className="text-xs text-quiet/50">—</span>
                      ) : (
                        <button
                          type="button"
                          className="text-xs text-quiet transition-colors hover:text-paper disabled:opacity-50"
                          disabled={busyEmail === row.email || loading}
                          onClick={() => onUnsubscribe(row.email)}
                        >
                          {busyEmail === row.email ? '…' : 'Unsubscribe'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-quiet">
        <div className="flex flex-wrap items-center gap-3">
          <p>{filteredTotal ? `Showing ${from}–${to} of ${filteredTotal}` : 'Showing 0'}</p>
          <label className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-[0.2em]">Per page</span>
            <select
              className="border border-line/50 bg-transparent px-2 py-1 text-paper outline-none disabled:opacity-40"
              value={pageSize}
              disabled={loading}
              onChange={onPageSizeChange}
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="transition-colors hover:text-paper disabled:opacity-40"
            disabled={!canPrev}
            onClick={() => goTo(page - 1)}
          >
            Previous
          </button>
          <span>
            Page {page} / {totalPages}
            {loading ? ' · …' : ''}
          </span>
          <button
            type="button"
            className="transition-colors hover:text-paper disabled:opacity-40"
            disabled={!canNext}
            onClick={() => goTo(page + 1)}
          >
            Next
          </button>
        </div>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  )
}
