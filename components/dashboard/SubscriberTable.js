'use client'

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

export default function SubscriberTable({ subscribers: initial }) {
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

  if (!rows.length) {
    return <p className="text-sm text-quiet">No subscribers yet.</p>
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left text-sm">
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
            {rows.map((row) => (
              <tr key={row.email} className="border-t border-line/40">
                <td className="py-3 pr-4 text-paper">{row.email}</td>
                <td className="py-3 pr-4 text-quiet">{prefLabel(row.prefs)}</td>
                <td className="py-3 pr-4 text-quiet">
                  {row.unsubscribedAt ? 'unsubscribed' : 'active'}
                </td>
                <td className="py-3 pr-4 text-quiet">{joinedLabel(row.createdAt)}</td>
                <td className="py-3 text-right">
                  {row.unsubscribedAt ? (
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
            ))}
          </tbody>
        </table>
      </div>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  )
}
