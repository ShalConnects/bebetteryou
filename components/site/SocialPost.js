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

function localInputValue(date = new Date(Date.now() + 60 * 60 * 1000)) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatWhen(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

export default function SocialPost({ slug }) {
  const [networks, setNetworks] = useState([])
  const [posts, setPosts] = useState({})
  const [schedules, setSchedules] = useState([])
  const [selected, setSelected] = useState([])
  const [runAt, setRunAt] = useState(localInputValue)
  const [busy, setBusy] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')

  function loadSchedules(nextSlug) {
    return fetch(`/api/social/schedule?slug=${encodeURIComponent(nextSlug)}`)
      .then((r) => r.json())
      .then((d) => setSchedules(d.schedules || []))
      .catch(() => setSchedules([]))
  }

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
    loadSchedules(slug)
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

  async function onSchedule() {
    if (!selected.length) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/social/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          networks: selected,
          runAt: new Date(runAt).toISOString(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to schedule')
      await loadSchedules(slug)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function onCancel(id) {
    if (!window.confirm('Cancel this scheduled post?')) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/social/schedule?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to cancel')
      await loadSchedules(slug)
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
  const pending = schedules.filter((s) => s.status === 'pending')
  const recent = schedules.filter((s) => s.status !== 'pending').slice(0, 3)

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
              {!n.ready
                ? n.pending
                  ? ' (pending)'
                  : ' (setup)'
                : log?.ok
                  ? ' (posted)'
                  : log && !log.ok
                    ? ' (failed)'
                    : ''}
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

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <button
          type="button"
          disabled={busy || !selected.length}
          onClick={onPost}
          className="btn disabled:opacity-50"
        >
          {busy ? 'Working…' : 'Post now'}
        </button>
        <label className="flex flex-col gap-1 text-sm text-quiet sm:flex-row sm:items-center sm:gap-2">
          <span className="sr-only">Schedule time</span>
          <input
            type="datetime-local"
            value={runAt}
            onChange={(e) => setRunAt(e.target.value)}
            className="w-full min-w-0 border border-line bg-ink px-3 py-2 text-paper outline-none focus:border-paper/40"
          />
        </label>
        <button
          type="button"
          disabled={busy || !selected.length || !runAt}
          onClick={onSchedule}
          className="btn disabled:opacity-50"
        >
          Schedule
        </button>
      </div>
      <p className="text-xs text-quiet">
        Cron runs daily at 14:00 UTC on Vercel (≈10am US East / 8pm Bangladesh). Set{' '}
        <code className="text-body">CRON_SECRET</code> in env. Pending jobs post on the next run after their
        time.
      </p>

      {pending.length ? (
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.2em] text-quiet">Scheduled</p>
          <ul className="space-y-2 text-sm">
            {pending.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 text-body">
                <span>
                  {formatWhen(s.runAt)} · {s.networks.join(', ')}
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onCancel(s.id)}
                  className="text-quiet underline-offset-2 hover:text-paper hover:underline disabled:opacity-50"
                >
                  Cancel
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {recent.length ? (
        <ul className="space-y-1 text-sm text-quiet">
          {recent.map((s) => (
            <li key={s.id}>
              {s.status}: {formatWhen(s.runAt)}
              {s.error ? ` — ${s.error}` : ''}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
