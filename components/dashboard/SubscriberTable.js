'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

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

function hrefFor({ page, status }) {
  const params = new URLSearchParams()
  if (status && status !== 'all') params.set('status', status)
  if (page && page > 1) params.set('page', String(page))
  const q = params.toString()
  return q ? `/dashboard/subscribers?${q}` : '/dashboard/subscribers'
}

export default function SubscriberTable({
  subscribers: initial,
  page = 1,
  pageSize = 50,
  totalPages = 1,
  filteredTotal = 0,
  status = 'all',
  activeCount = 0,
  unsubscribedCount = 0,
  totalCount = 0,
}) {
  const router = useRouter()
  const [rows, setRows] = useState(initial)
  const [busyEmail, setBusyEmail] = useState('')
  const [error, setError] = useState('')

  async function onUnsubscribe(email) {
    if (!window.confirm(`Unsubscribe ${email}? They stay on the list but won’t get mail.`)) return
    setBusyEmail(email)
    setError('')
    try {
      const res = await fetch('/api/newsletter/subscriber', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      router.refresh()
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {filters.map((f) => {
          const active = status === f.id
          return (
            <Link
              key={f.id}
              href={hrefFor({ page: 1, status: f.id })}
              className={`text-[11px] uppercase tracking-[0.2em] transition-colors ${
                active ? 'text-accent' : 'text-quiet hover:text-paper'
              }`}
            >
              {f.label} ({f.count})
            </Link>
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
                    <td className={`py-3 pr-4 ${off ? 'text-quiet' : 'text-paper'}`}>{row.email}</td>
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
                          disabled={busyEmail === row.email}
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
        <p>
          {filteredTotal
            ? `Showing ${from}–${to} of ${filteredTotal}`
            : 'Showing 0'}
        </p>
        <div className="flex items-center gap-3">
          {page > 1 ? (
            <Link
              href={hrefFor({ page: page - 1, status })}
              className="text-quiet transition-colors hover:text-paper"
            >
              Previous
            </Link>
          ) : (
            <span className="opacity-40">Previous</span>
          )}
          <span>
            Page {page} / {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={hrefFor({ page: page + 1, status })}
              className="text-quiet transition-colors hover:text-paper"
            >
              Next
            </Link>
          ) : (
            <span className="opacity-40">Next</span>
          )}
        </div>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  )
}
