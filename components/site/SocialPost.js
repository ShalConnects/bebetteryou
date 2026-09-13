'use client'

import { useEffect, useState } from 'react'
import { alreadyPosted, defaultSelected } from '@/libs/social/post-log'

function applyResults(posts, results) {
  const next = { ...posts }
  for (const r of results || []) {
    next[r.id] = {
      ok: r.ok,
      error: r.error || '',
      url: r.ok ? r.url || next[r.id]?.url || '' : next[r.id]?.url || '',
      privacy: r.ok ? r.privacy || '' : next[r.id]?.privacy || '',
      channel: r.ok ? r.channel || '' : next[r.id]?.channel || '',
    }
  }
  return next
}

export default function SocialPost({ slug }) {
  const [networks, setNetworks] = useState([])
  const [posts, setPosts] = useState({})
  const [selected, setSelected] = useState([])
  const [busy, setBusy] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!slug) return
    fetch(`/api/social/post?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((d) => {
        const list = d.networks || []
        const log = d.posts || {}
        setNetworks(list)
        setPosts(log)
        setSelected(defaultSelected(list, log))
        setResults(null)
        setError('')
      })
      .catch(() => {})
  }, [slug])

  function toggle(id) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  async function onPost() {
    const again = alreadyPosted(selected, posts)
    if (again.length) {
      const names = again.map((id) => networks.find((n) => n.id === id)?.label || id).join(', ')
      if (!window.confirm(`Already posted to ${names} — post again?`)) return
    }
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
      const next = applyResults(posts, data.results)
      setPosts(next)
      setSelected(defaultSelected(networks, next))
      setResults(data.results)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (!networks.length) return null

  const ready = networks.filter((n) => n.ready)
  const shown = results?.length
    ? results
    : networks.filter((n) => posts[n.id]).map((n) => ({ ...posts[n.id], id: n.id, label: n.label }))

  return (
    <div className="mt-8 space-y-4 border-t border-line pt-8">
      <p className="text-[11px] uppercase tracking-[0.2em] text-quiet">Post to social</p>
      {ready.length === 0 ? (
        <p className="text-sm text-quiet">
          Add API keys in <code className="text-body">.env.local</code> (see env.example). Instagram and Threads
          need a public <code className="text-body">SITE_URL</code>. YouTube Shorts: Connect below, then Post.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-4">
        {networks.map((n) => {
          const log = posts[n.id]
          return (
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
              {!n.ready ? ' (setup)' : log?.ok ? ' (posted)' : log && !log.ok ? ' (failed)' : ''}
            </label>
          )
        })}
      </div>
      {networks.some((n) => n.id === 'youtube' && n.connectable) ? (
        <p className="text-sm">
          <a href="/api/social/youtube/connect" className="text-paper underline-offset-2 hover:underline">
            Connect YouTube
          </a>{' '}
          <span className="text-quiet">to post Shorts from this site.</span>
        </p>
      ) : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {shown.length ? (
        <ul className="space-y-1 text-sm">
          {shown.map((r) => {
            const saved = posts[r.id]
            const ok = r.ok
            const url = (ok ? r.url : saved?.url) || saved?.url
            const privacy = ok ? r.privacy || saved?.privacy : saved?.privacy
            const channel = ok ? r.channel || saved?.channel : saved?.channel
            return (
              <li key={r.id} className={ok ? 'text-body' : 'text-red-400'}>
                {r.label || r.id}:{' '}
                {ok ? (
                  <>
                    Posted
                    {privacy ? ` (${privacy})` : ''}
                    {channel ? ` on ${channel}` : ''}
                    {url ? (
                      <>
                        {' '}
                        <a href={url} target="_blank" rel="noreferrer" className="text-paper underline-offset-2 hover:underline">
                          Open
                        </a>
                      </>
                    ) : null}
                  </>
                ) : (
                  <>
                    {r.error || saved?.error || 'Failed'}
                    {url ? (
                      <>
                        {' '}
                        <a href={url} target="_blank" rel="noreferrer" className="text-paper underline-offset-2 hover:underline">
                          Last post
                        </a>
                      </>
                    ) : null}
                  </>
                )}
              </li>
            )
          })}
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
