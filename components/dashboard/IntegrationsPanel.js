'use client'

import { useMemo, useState } from 'react'

function StatusBadge({ row }) {
  if (row.pending) {
    return <span className="text-xs uppercase tracking-wider text-amber-400/90">Pending</span>
  }
  if (row.ready) {
    return <span className="text-xs uppercase tracking-wider text-emerald-400/90">Ready</span>
  }
  if (row.reconnect) {
    return <span className="text-xs uppercase tracking-wider text-amber-400/90">Reconnect</span>
  }
  return <span className="text-xs uppercase tracking-wider text-quiet">Not set</span>
}

function ServiceCard({ row, values, onChange, onSave, onClear, busy }) {
  const connectLabel = row.reconnect || row.ready ? `Reconnect ${row.label}` : `Connect ${row.label}`

  return (
    <article className="border border-line p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-lg text-paper">{row.label}</h3>
        <StatusBadge row={row} />
      </div>
      {row.detail ? <p className="mt-1 text-sm text-quiet">{row.detail}</p> : null}
      {row.lastError ? <p className="mt-1 text-sm text-red-400">{row.lastError}</p> : null}

      {row.connectHref ? (
        <p className="mt-4 text-sm">
          <a href={row.connectHref} className="text-paper underline-offset-2 hover:underline">
            {connectLabel}
          </a>
          {row.id === 'pinterest' && !row.ready ? (
            <span className="text-quiet"> — board id alone is not enough; Pinterest needs a fresh OAuth token.</span>
          ) : null}
        </p>
      ) : null}

      {row.fields?.length ? (
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            onSave(row.id)
          }}
        >
          {row.fields.map((field) => (
            <label key={field.key} className="block">
              <span className="text-[11px] uppercase tracking-[0.15em] text-quiet">{field.label}</span>
              <input
                type={field.secret ? 'password' : 'text'}
                autoComplete="off"
                placeholder={field.secret ? '•••••••• (leave blank to keep)' : field.env || ''}
                value={values[field.key] || ''}
                onChange={(e) => onChange(row.id, field.key, e.target.value)}
                className="mt-1 w-full border border-line bg-ink px-3 py-2 text-sm text-paper outline-none focus:border-paper/40"
              />
            </label>
          ))}
          <div className="flex flex-wrap gap-3 pt-1">
            <button
              type="submit"
              disabled={busy === row.id}
              className="border border-paper/40 px-3 py-1.5 text-sm text-paper hover:bg-paper/10 disabled:opacity-50"
            >
              {busy === row.id ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              disabled={busy === row.id}
              onClick={() => onClear(row.id)}
              className="text-sm text-quiet underline-offset-2 hover:underline disabled:opacity-50"
            >
              Clear stored
            </button>
          </div>
        </form>
      ) : null}

      {!row.connectHref && !row.fields?.length ? (
        <p className="mt-3 text-sm text-quiet">Configured via environment variables on the host.</p>
      ) : null}
    </article>
  )
}

export default function IntegrationsPanel({ initialSocial, initialEmail, flash }) {
  const [social, setSocial] = useState(initialSocial || [])
  const [email, setEmail] = useState(initialEmail || [])
  const [drafts, setDrafts] = useState({})
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState(flash || '')
  const [error, setError] = useState('')

  const readyCount = useMemo(() => social.filter((n) => n.ready).length, [social])

  function setField(network, key, value) {
    setDrafts((prev) => ({
      ...prev,
      [network]: { ...(prev[network] || {}), [key]: value },
    }))
  }

  async function save(network) {
    setBusy(network)
    setError('')
    setMessage('')
    try {
      const res = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ network, fields: drafts[network] || {} }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setSocial(data.social || [])
      setEmail(data.email || [])
      setDrafts((prev) => ({ ...prev, [network]: {} }))
      setMessage(`${network} saved`)
    } catch (err) {
      setError(err.message || 'Save failed')
    } finally {
      setBusy('')
    }
  }

  async function clear(network) {
    if (!window.confirm(`Clear stored credentials for ${network}? Env vars still apply.`)) return
    setBusy(network)
    setError('')
    setMessage('')
    try {
      const res = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ network, clear: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Clear failed')
      setSocial(data.social || [])
      setEmail(data.email || [])
      setMessage(`${network} cleared`)
    } catch (err) {
      setError(err.message || 'Clear failed')
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="space-y-8">
      <p className="text-sm text-quiet">
        {readyCount} of {social.length} social networks ready to post.
      </p>

      {message ? <p className="text-sm text-emerald-400/90">{message}</p> : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <section className="space-y-4">
        <h2 className="heading-sm">Social</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {social.map((row) => (
            <ServiceCard
              key={row.id}
              row={row}
              values={drafts[row.id] || {}}
              onChange={setField}
              onSave={save}
              onClear={clear}
              busy={busy}
            />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="heading-sm">Email</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {email.map((row) => (
            <ServiceCard
              key={row.id}
              row={row}
              values={{}}
              onChange={() => {}}
              onSave={() => {}}
              onClear={() => {}}
              busy=""
            />
          ))}
        </div>
        <p className="text-sm text-quiet">
          Resend and SES keys stay in Vercel env (not editable here). SES must be set before whole-list
          quote blasts leave Resend.
        </p>
      </section>
    </div>
  )
}
