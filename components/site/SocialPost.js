'use client'

import { useEffect, useState } from 'react'

export default function SocialPost({ slug }) {
  const [networks, setNetworks] = useState([])
  const [selected, setSelected] = useState([])
  const [busy, setBusy] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/social/post')
      .then((r) => r.json())
      .then((d) => {
        const list = d.networks || []
        setNetworks(list)
        setSelected(list.filter((n) => n.ready).map((n) => n.id))
      })
      .catch(() => {})
  }, [])

  function toggle(id) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  async function onPost() {
    setBusy(true)
    setError('')
    setResults(null)
    try {
      const res = await fetch('/api/social/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, networks: selected }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setResults(data.results)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (!networks.length) return null

  const ready = networks.filter((n) => n.ready)

  return (
    <div className="mt-8 space-y-4 border-t border-line pt-8">
      <p className="text-[11px] uppercase tracking-[0.2em] text-quiet">Post to social</p>
      {ready.length === 0 ? (
        <p className="text-sm text-quiet">
          Add API keys in <code className="text-body">.env.local</code> (see env.example). LinkedIn works locally;
          Instagram needs a public <code className="text-body">SITE_URL</code>.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-4">
        {networks.map((n) => (
          <label
            key={n.id}
            className={`flex items-center gap-2 text-sm ${n.ready ? 'text-body' : 'text-quiet/50'}`}
          >
            <input
              type="checkbox"
              disabled={!n.ready}
              checked={selected.includes(n.id)}
              onChange={() => toggle(n.id)}
              className="accent-paper"
            />
            {n.label}
            {!n.ready ? ' (setup)' : ''}
          </label>
        ))}
      </div>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {results ? (
        <ul className="space-y-1 text-sm">
          {results.map((r) => (
            <li key={r.id} className={r.ok ? 'text-body' : 'text-red-400'}>
              {r.label || r.id}: {r.ok ? 'Posted' : r.error}
            </li>
          ))}
        </ul>
      ) : null}
      <button
        type="button"
        disabled={busy || !selected.length}
        onClick={onPost}
        className="btn disabled:opacity-50"
      >
        {busy ? 'Posting…' : 'Post'}
      </button>
    </div>
  )
}
