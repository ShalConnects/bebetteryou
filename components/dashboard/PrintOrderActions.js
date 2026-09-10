'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

/** Retry Printful submit, or record payment when no processor is wired. */
export default function PrintOrderActions({ order, onStatus }) {
  const router = useRouter()
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  async function post(path, status) {
    setBusy(path)
    setError('')
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderNumber: order.orderNumber }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      if (onStatus) onStatus(data.status || status)
      else router.refresh()
    } else {
      setError(data.reason || data.error || 'Failed.')
    }
    setBusy('')
  }

  if (!order.canMarkPaid && !order.canFulfill && !error) return null

  return (
    <div className="flex flex-wrap items-center gap-3">
      {order.canMarkPaid ? (
        <button
          type="button"
          onClick={() => post('/api/print/paid', 'paid')}
          disabled={Boolean(busy)}
          className="tag disabled:opacity-50"
        >
          {busy === '/api/print/paid' ? '…' : 'Mark paid'}
        </button>
      ) : null}
      {order.canFulfill ? (
        <button
          type="button"
          onClick={() => post('/api/print/fulfill', 'submitted')}
          disabled={Boolean(busy)}
          className="tag disabled:opacity-50"
        >
          {busy === '/api/print/fulfill' ? '…' : 'Retry'}
        </button>
      ) : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  )
}
