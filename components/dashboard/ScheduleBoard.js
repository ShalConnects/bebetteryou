'use client'

import Link from 'next/link'
import { useState } from 'react'

function formatWhen(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: 'short',
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'UTC',
    }) + ' UTC'
  } catch {
    return iso
  }
}

export default function ScheduleBoard({ initial = [] }) {
  const [rows, setRows] = useState(initial)
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
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId('')
    }
  }

  if (!rows.length) {
    return <p className="text-sm text-quiet">No schedules yet. Open a quote and use Schedule under Post to social.</p>
  }

  const pending = rows.filter((r) => r.status === 'pending')
  const other = rows.filter((r) => r.status !== 'pending')

  return (
    <div className="space-y-8">
      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <section className="space-y-3">
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-quiet">
          Upcoming ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-quiet">Nothing pending.</p>
        ) : (
          <ul className="divide-y divide-line/40 border border-line">
            {pending.map((row) => (
              <li key={row.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 text-sm">
                  <Link href={`/quotes/${row.slug}`} className="text-paper underline-offset-2 hover:underline">
                    {row.slug}
                  </Link>
                  <p className="text-body">{formatWhen(row.runAt)}</p>
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
                {' · '}
                {row.slug}
                {' · '}
                {formatWhen(row.runAt)}
                {row.error ? ` — ${row.error}` : ''}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
