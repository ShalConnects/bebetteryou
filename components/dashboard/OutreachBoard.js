'use client'

import { useCallback, useEffect, useState } from 'react'
import { DashPanel } from '@/components/dashboard/ui'
import { Card } from '@/components/ui/card'

const CONTACT_FILTERS = [
  ['all', 'All'],
  ['unsent', 'Not sent'],
  ['sent', 'Sent'],
  ['stopped', 'Unsubscribed'],
]

export default function OutreachBoard({ initialStatus, initialPreview }) {
  const [tab, setTab] = useState('overview')
  const [status, setStatus] = useState(initialStatus)
  const [preview, setPreview] = useState(initialPreview)
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [csv, setCsv] = useState('')
  const [fileName, setFileName] = useState('')
  const [confirmedOptIn, setConfirmedOptIn] = useState(false)
  const [importMode, setImportMode] = useState('merge')
  const [unsubEmail, setUnsubEmail] = useState('')

  const [contacts, setContacts] = useState([])
  const [contactTotal, setContactTotal] = useState(0)
  const [contactPage, setContactPage] = useState(1)
  const [contactFilter, setContactFilter] = useState('all')
  const [contactQuery, setContactQuery] = useState('')
  const [contactSearch, setContactSearch] = useState('')
  const [contactsLoading, setContactsLoading] = useState(false)
  const [addName, setAddName] = useState('')
  const [addEmail, setAddEmail] = useState('')
  const [editingEmail, setEditingEmail] = useState('')
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [sendProgress, setSendProgress] = useState(initialStatus?.sendProgress || null)

  const pageSize = 50
  const contactPages = Math.max(1, Math.ceil(contactTotal / pageSize) || 1)

  const load = useCallback(async () => {
    const [sRes, pRes] = await Promise.all([
      fetch('/api/outreach', { credentials: 'same-origin' }),
      fetch('/api/outreach?view=preview', { credentials: 'same-origin' }),
    ])
    const sData = await sRes.json()
    const pData = await pRes.json()
    if (!sRes.ok) throw new Error(sData.error || 'Failed to load status')
    if (!pRes.ok) throw new Error(pData.error || 'Failed to load preview')
    setStatus(sData)
    setPreview(pData)
    if (sData.sendProgress) setSendProgress(sData.sendProgress)
  }, [])

  const pollSendProgress = useCallback(async () => {
    try {
      const res = await fetch('/api/outreach?view=send-progress', { credentials: 'same-origin' })
      const data = await res.json()
      if (res.ok) setSendProgress(data)
      return data
    } catch {
      return null
    }
  }, [])

  const loadContacts = useCallback(async () => {
    setContactsLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({
        view: 'contacts',
        filter: contactFilter,
        page: String(contactPage),
        pageSize: String(pageSize),
      })
      if (contactSearch.trim()) params.set('q', contactSearch.trim())
      const res = await fetch(`/api/outreach?${params}`, { credentials: 'same-origin' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load contacts')
      setContacts(data.contacts || [])
      setContactTotal(data.total || 0)
    } catch (err) {
      setError(err.message || 'Failed to load contacts')
    } finally {
      setContactsLoading(false)
    }
  }, [contactFilter, contactPage, contactSearch])

  useEffect(() => {
    setStatus(initialStatus)
    setPreview(initialPreview)
    if (initialStatus?.sendProgress) setSendProgress(initialStatus.sendProgress)
  }, [initialStatus, initialPreview])

  useEffect(() => {
    if (tab !== 'contacts') return
    loadContacts()
  }, [tab, loadContacts])

  useEffect(() => {
    if (busy !== 'send' && !sendProgress?.active) return undefined
    const id = setInterval(() => {
      pollSendProgress()
    }, 800)
    pollSendProgress()
    return () => clearInterval(id)
  }, [busy, sendProgress?.active, pollSendProgress])

  async function run(action, body = {}, { reloadContacts = false } = {}) {
    setBusy(action)
    setError('')
    setMessage('')
    if (action === 'send') {
      setSendProgress({
        active: true,
        phase: 'preparing',
        total: status?.roomToday || 0,
        done: 0,
        failed: 0,
        percent: 0,
        etaSeconds: estimateSendSeconds(status?.roomToday || 0),
        currentEmail: '',
      })
    }
    try {
      const res = await fetch('/api/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ action, ...body }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Request failed')
      if (action === 'self') setMessage(`Self-test sent${data.id ? ` (${data.id})` : ''}`)
      if (action === 'send') {
        const secs = data.durationMs ? Math.round(data.durationMs / 1000) : null
        setMessage(
          `Finished: sent ${data.sent} of ${data.attempted}` +
            (data.failures?.length ? ` · stopped after ${data.failures.length} failure(s)` : '') +
            (secs != null ? ` · ${formatDuration(secs)}` : '')
        )
        if (data.progress) setSendProgress(data.progress)
        else await pollSendProgress()
      }
      if (action === 'import') {
        setMessage(
          `${data.mode === 'replace' ? 'Replaced' : 'Merged'} ${data.upserted ?? data.total} · invalid ${data.invalidCount} · dupes ${data.duplicateCount}`
        )
        setCsv('')
        setFileName('')
        setConfirmedOptIn(false)
      }
      if (action === 'unsubscribe') {
        setMessage(data.added ? `Unsubscribed ${data.email}` : `Already stopped: ${data.email}`)
        setUnsubEmail('')
      }
      if (action === 'contact-add') {
        setMessage(`Added ${data.contact?.email}`)
        setAddName('')
        setAddEmail('')
      }
      if (action === 'contact-update') setMessage(`Updated ${data.contact?.email}`)
      if (action === 'contact-delete') setMessage(`Deleted ${data.email}`)
      if (action === 'contact-clear-sent') {
        setMessage(data.cleared ? `Cleared sent for ${data.email}` : `No send record for ${data.email}`)
      }
      if (action === 'contact-resubscribe') {
        setMessage(data.restored ? `Resubscribed ${data.email}` : `${data.email} was not stopped`)
      }
      if (data.status) setStatus(data.status)
      else await load()
      if (reloadContacts || tab === 'contacts') await loadContacts()
      return data
    } catch (err) {
      setError(err.message || 'Request failed')
      return null
    } finally {
      setBusy('')
    }
  }

  async function onFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setCsv(await file.text())
    setFileName(file.name)
  }

  function startEdit(row) {
    setEditingEmail(row.email)
    setEditName(row.name || '')
    setEditEmail(row.email)
  }

  function cancelEdit() {
    setEditingEmail('')
    setEditName('')
    setEditEmail('')
  }

  async function saveEdit() {
    const data = await run(
      'contact-update',
      {
        email: editingEmail,
        name: editName,
        newEmail: editEmail.trim() !== editingEmail ? editEmail.trim() : undefined,
      },
      { reloadContacts: true }
    )
    if (data) cancelEdit()
  }

  const tabs = [
    ['overview', 'Overview'],
    ['contacts', 'Contacts'],
    ['tools', 'Tools'],
    ['sends', 'Sends'],
  ]

  return (
    <div className="space-y-4">
      <nav aria-label="Outreach sections" className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-muted/30 p-1">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? <p className="text-sm text-primary">{message}</p> : null}

      {tab === 'overview' && status ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <Stat label="Valid on list" value={status.valid} hint={status.listMissing ? 'No list yet' : null} />
            <Stat label="Remaining" value={status.remaining} />
            <Stat label="Sent today" value={`${status.usedToday}/${status.cap}`} hint={`${status.roomToday} left`} />
            <Stat label="Unsubscribed" value={status.unsubscribed} />
            <Stat label="Bounces" value={status.bounced ?? 0} />
            <Stat label="Complaints" value={status.complained ?? 0} />
          </div>
          <DashPanel title="Sender" description="ShalConnects Resend only — never BeBetterYou quote mail. Storage: MongoDB.">
            <p className="text-sm">
              From: <span className="text-foreground">{status.from}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              API key: {status.hasResendKey ? 'set' : 'missing SHALCONNECTS_RESEND_API_KEY'}
            </p>
            <p className="text-sm text-muted-foreground">
              Bounce/complaint webhook:{' '}
              {status.hasWebhookSecret ? 'secret set' : 'missing SHALCONNECTS_RESEND_WEBHOOK_SECRET'}
            </p>
            {status.webhookUrl ? (
              <p className="mt-2 break-all rounded-md bg-muted px-2 py-1.5 text-xs text-muted-foreground">
                Resend webhook URL: <span className="text-foreground">{status.webhookUrl}</span>
                <br />
                Events: email.bounced, email.complained
              </p>
            ) : null}
            {status.loadError ? <p className="text-sm text-destructive">{status.loadError}</p> : null}
          </DashPanel>
          {preview ? (
            <DashPanel title={`Next batch (${preview.batchSize})`} description="HTML + plain-text dry-run preview.">
              <p className="text-sm font-medium text-foreground">{preview.subject}</p>
              {preview.html ? (
                <iframe
                  title="Outreach email preview"
                  srcDoc={preview.html}
                  className="mt-3 h-[520px] w-full rounded-md border border-border bg-[#070b14]"
                  sandbox=""
                />
              ) : null}
              <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs text-muted-foreground">
                {preview.text}
              </pre>
            </DashPanel>
          ) : null}
        </>
      ) : null}

      {tab === 'contacts' ? (
        <>
          <DashPanel
            title="Contacts"
            description="Search, filter, add, edit, or delete. Sent/unsub history is kept when you delete a contact so we don’t re-mail stopped addresses."
          >
            <div className="flex flex-wrap items-end gap-2">
              <label className="min-w-[200px] flex-1 text-sm">
                <span className="mb-1 block text-muted-foreground">Search name or email</span>
                <input
                  value={contactQuery}
                  onChange={(e) => setContactQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setContactPage(1)
                      setContactSearch(contactQuery)
                    }
                  }}
                  placeholder="ada@ or Ada"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </label>
              <button
                type="button"
                className="btn"
                disabled={contactsLoading}
                onClick={() => {
                  setContactPage(1)
                  setContactSearch(contactQuery)
                }}
              >
                Search
              </button>
              <button
                type="button"
                className="btn"
                disabled={contactsLoading}
                onClick={() => {
                  setContactQuery('')
                  setContactSearch('')
                  setContactPage(1)
                }}
              >
                Clear
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-1">
              {CONTACT_FILTERS.map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setContactFilter(id)
                    setContactPage(1)
                  }}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    contactFilter === id
                      ? 'bg-background text-foreground shadow-sm ring-1 ring-border'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <p className="mt-3 text-sm text-muted-foreground">
              {contactsLoading
                ? 'Loading…'
                : `${contactTotal.toLocaleString()} match${contactTotal === 1 ? '' : 'es'} · page ${contactPage} of ${contactPages}`}
            </p>

            <div className="mt-3 overflow-x-auto rounded-md border border-border">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Email</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Sent day</th>
                    <th className="px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {!contactsLoading && contacts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-muted-foreground">
                        No contacts for this filter.
                      </td>
                    </tr>
                  ) : null}
                  {contacts.map((row) => {
                    const editing = editingEmail === row.email
                    return (
                      <tr key={row.email} className="align-top">
                        <td className="px-3 py-2">
                          {editing ? (
                            <input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
                            />
                          ) : (
                            row.name || <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {editing ? (
                            <input
                              value={editEmail}
                              onChange={(e) => setEditEmail(e.target.value)}
                              className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
                            />
                          ) : (
                            <span className="break-all">{row.email}</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <StatusPill status={row.status} reason={row.reason} />
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{row.sentDay || '—'}</td>
                        <td className="px-3 py-2">
                          {editing ? (
                            <div className="flex flex-wrap gap-1">
                              <button
                                type="button"
                                className="btn"
                                disabled={Boolean(busy)}
                                onClick={saveEdit}
                              >
                                Save
                              </button>
                              <button type="button" className="btn" onClick={cancelEdit}>
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              <button type="button" className="btn" onClick={() => startEdit(row)}>
                                Edit
                              </button>
                              {row.status === 'sent' ? (
                                <button
                                  type="button"
                                  className="btn"
                                  disabled={Boolean(busy)}
                                  onClick={() =>
                                    run('contact-clear-sent', { email: row.email }, { reloadContacts: true })
                                  }
                                >
                                  Mark unsent
                                </button>
                              ) : null}
                              {row.status === 'stopped' ? (
                                <button
                                  type="button"
                                  className="btn"
                                  disabled={Boolean(busy)}
                                  onClick={() =>
                                    run('contact-resubscribe', { email: row.email }, { reloadContacts: true })
                                  }
                                >
                                  Resubscribe
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="btn"
                                  disabled={Boolean(busy)}
                                  onClick={() =>
                                    run('unsubscribe', { email: row.email }, { reloadContacts: true })
                                  }
                                >
                                  Unsub
                                </button>
                              )}
                              <button
                                type="button"
                                className="btn"
                                disabled={Boolean(busy)}
                                onClick={() => {
                                  if (!window.confirm(`Delete ${row.email} from the contact list?`)) return
                                  run('contact-delete', { email: row.email }, { reloadContacts: true })
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="btn"
                disabled={contactPage <= 1 || contactsLoading}
                onClick={() => setContactPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn"
                disabled={contactPage >= contactPages || contactsLoading}
                onClick={() => setContactPage((p) => p + 1)}
              >
                Next
              </button>
              <button
                type="button"
                className="btn"
                disabled={contactsLoading}
                onClick={() => loadContacts()}
              >
                Refresh
              </button>
            </div>
          </DashPanel>

          <DashPanel title="Add contact" description="Adds one address to the outreach list (must be a valid email).">
            <div className="flex flex-wrap gap-2">
              <input
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="Name (optional)"
                className="min-w-[160px] flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
              <input
                type="email"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder="email@example.com"
                className="min-w-[220px] flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
              <button
                type="button"
                className="btn"
                disabled={Boolean(busy) || !addEmail.trim()}
                onClick={() =>
                  run('contact-add', { email: addEmail.trim(), name: addName.trim() }, { reloadContacts: true })
                }
              >
                {busy === 'contact-add' ? 'Adding…' : 'Add'}
              </button>
            </div>
          </DashPanel>
        </>
      ) : null}

      {tab === 'tools' ? (
        <>
          <DashPanel
            title="Import list"
            description="CSV with email column or one email per line. Merge keeps existing contacts; Replace wipes the contact list first (sent/unsub history kept)."
          >
            <div className="flex flex-wrap items-center gap-3">
              <label className="btn cursor-pointer">
                Choose CSV
                <input type="file" accept=".csv,text/csv,text/plain" className="hidden" onChange={onFile} />
              </label>
              {fileName ? <span className="text-sm text-muted-foreground">{fileName}</span> : null}
            </div>
            <textarea
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              rows={8}
              placeholder={'name,email\nAda,ada@example.com'}
              className="mt-3 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === 'merge'}
                  onChange={() => setImportMode('merge')}
                />
                Merge (safe default)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')}
                />
                Replace entire list
              </label>
            </div>
            <label className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={confirmedOptIn}
                onChange={(e) => setConfirmedOptIn(e.target.checked)}
                className="mt-1"
              />
              I confirm every address opted in for ShalConnects marketing on the old site.
            </label>
            <button
              type="button"
              disabled={Boolean(busy) || !confirmedOptIn}
              onClick={() => {
                if (
                  importMode === 'replace' &&
                  !window.confirm('Replace will delete all outreach contacts, then import this CSV. Continue?')
                ) {
                  return
                }
                run('import', { csv, confirmedOptIn: true, mode: importMode })
              }}
              className="btn mt-3"
            >
              {busy === 'import' ? 'Importing…' : importMode === 'replace' ? 'Replace list' : 'Merge import'}
            </button>
          </DashPanel>

          <DashPanel title="Send" description="Self-test → hello@shalconnects.com. Send uses today’s remaining room.">
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={Boolean(busy)} onClick={() => run('self')} className="btn">
                {busy === 'self' ? 'Sending…' : 'Send self-test'}
              </button>
              <button
                type="button"
                disabled={Boolean(busy) || !status?.roomToday}
                onClick={() => {
                  const n = status?.roomToday || 0
                  const eta = formatDuration(estimateSendSeconds(n))
                  if (
                    !window.confirm(
                      `Send up to ${n} ShalConnects emails now?\nEstimated time: about ${eta}.`
                    )
                  ) {
                    return
                  }
                  run('send')
                }}
                className="btn"
              >
                {busy === 'send'
                  ? sendProgress?.phase === 'preparing'
                    ? 'Preparing…'
                    : `Sending ${sendProgress?.done ?? 0}/${sendProgress?.total || status?.roomToday || 0}…`
                  : `Send today (${status?.roomToday ?? 0})`}
              </button>
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => load().catch((e) => setError(e.message))}
                className="btn"
              >
                Refresh
              </button>
            </div>
            {status?.roomToday && busy !== 'send' ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Full run of {status.roomToday}: about {formatDuration(estimateSendSeconds(status.roomToday))}
              </p>
            ) : null}
            {busy === 'send' || sendProgress?.active || sendProgress?.phase === 'sending' ? (
              <SendProgressBar progress={sendProgress} />
            ) : null}
            {sendProgress?.phase === 'done' && sendProgress?.total > 0 && busy !== 'send' ? (
              <p className="mt-3 text-sm text-primary">
                Last run finished: {sendProgress.done}/{sendProgress.total} sent
                {sendProgress.finishedAt
                  ? ` · ${String(sendProgress.finishedAt).slice(0, 19).replace('T', ' ')}`
                  : ''}
              </p>
            ) : null}
            {sendProgress?.phase === 'error' && busy !== 'send' ? (
              <p className="mt-3 text-sm text-destructive">
                Last run stopped at {sendProgress.done}/{sendProgress.total}
                {sendProgress.lastError ? `: ${sendProgress.lastError}` : ''}
              </p>
            ) : null}
          </DashPanel>

          <DashPanel
            title="Manual unsubscribe"
            description="Stops future outreach. Same list used when someone replies unsubscribe, or after bounce/complaint."
          >
            <div className="flex flex-wrap gap-2">
              <input
                type="email"
                value={unsubEmail}
                onChange={(e) => setUnsubEmail(e.target.value)}
                placeholder="email@example.com"
                className="min-w-[220px] flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={Boolean(busy) || !unsubEmail.trim()}
                onClick={() => run('unsubscribe', { email: unsubEmail.trim() })}
                className="btn"
              >
                {busy === 'unsubscribe' ? 'Saving…' : 'Unsubscribe'}
              </button>
            </div>
          </DashPanel>
        </>
      ) : null}

      {tab === 'sends' ? (
        <>
          <DashPanel
            title={`Failed / removed (${status?.recentRemoved?.length || 0})`}
            description="Invalid imports, send failures, and auto-stops. Do not re-import bounced or complained addresses."
          >
            <EmailTable
              empty="No removed rows yet."
              rows={(status?.recentRemoved || []).map((r) => ({
                email: r.email,
                meta: `${r.reason}${r.day ? ` · ${r.day}` : ''}`,
              }))}
            />
          </DashPanel>

          <DashPanel
            title={`Bounces & spam (${(status?.bounced || 0) + (status?.complained || 0)})`}
            description="From ShalConnects Resend webhook (/api/webhook/shal-resend). These addresses are auto-unsubscribed."
          >
            <EmailTable
              stacked
              empty="No bounce or complaint events yet. Configure SHALCONNECTS_RESEND_WEBHOOK_SECRET."
              rows={(status?.recentEvents || []).map((r) => ({
                email: r.email || '(missing address)',
                meta: `${r.type}${r.message ? ` · ${r.message}` : ''}${r.createdAt ? ` · ${String(r.createdAt).slice(0, 10)}` : ''}`,
              }))}
            />
          </DashPanel>

          <DashPanel
            title={`Unsubscribed (${status?.unsubscribed || 0})`}
            description="Won’t receive outreach again (Mongo stop list)."
          >
            <EmailTable
              empty="No unsubscribes yet."
              rows={(status?.recentUnsubscribed || []).map((r) => ({
                email: r.email,
                meta: r.reason || 'stopped',
              }))}
            />
          </DashPanel>

          <DashPanel title="Recent sends" description="Mongo send log (walk-once until list finished).">
            <EmailTable
              empty="No sends logged yet."
              rows={(status?.recentSent || []).map((r) => ({ email: r.email, meta: r.day }))}
            />
          </DashPanel>
        </>
      ) : null}
    </div>
  )
}

function estimateSendSeconds(count) {
  const n = Math.max(0, Number(count) || 0)
  // ~0.9s API + default 200ms gap between sends
  return Math.ceil(n * 1.1)
}

function formatDuration(totalSeconds) {
  const s = Math.max(0, Number(totalSeconds) || 0)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rem = s % 60
  return rem ? `${m}m ${rem}s` : `${m}m`
}

function SendProgressBar({ progress }) {
  if (!progress) return null
  const total = progress.total || 0
  const done = progress.done || 0
  const percent = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : progress.percent || 0
  const phaseLabel =
    progress.phase === 'preparing'
      ? 'Preparing list…'
      : progress.phase === 'error'
        ? 'Stopped'
        : progress.phase === 'done'
          ? 'Done'
          : 'Sending…'

  return (
    <div className="mt-4 rounded-md border border-border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-medium text-foreground">
          {phaseLabel} {total ? `${done} / ${total}` : ''}
        </span>
        <span className="text-muted-foreground">
          {progress.etaSeconds != null && progress.phase === 'sending'
            ? `~${formatDuration(progress.etaSeconds)} left`
            : progress.phase === 'preparing'
              ? 'Estimating…'
              : null}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      {progress.currentEmail ? (
        <p className="mt-2 truncate text-xs text-muted-foreground">Now: {progress.currentEmail}</p>
      ) : null}
      {progress.lastError ? <p className="mt-1 text-xs text-destructive">{progress.lastError}</p> : null}
    </div>
  )
}

function Stat({ label, value, hint }) {
  return (
    <Card className="p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </Card>
  )
}

function StatusPill({ status, reason }) {
  const styles =
    status === 'stopped'
      ? 'bg-destructive/10 text-destructive'
      : status === 'sent'
        ? 'bg-primary/10 text-primary'
        : 'bg-muted text-muted-foreground'
  const label = status === 'stopped' ? 'Unsubscribed' : status === 'sent' ? 'Sent' : 'Not sent'
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles}`} title={reason || undefined}>
      {label}
    </span>
  )
}

function EmailTable({ rows, empty, stacked = false }) {
  if (!rows?.length) return <p className="text-sm text-muted-foreground">{empty}</p>
  return (
    <ul className="divide-y divide-border text-sm">
      {rows.map((row, index) => (
        <li
          key={`${row.email}-${row.meta}-${index}`}
          className={stacked ? 'space-y-1 py-2.5' : 'flex justify-between gap-3 py-2'}
        >
          <span className={stacked ? 'break-all font-medium text-foreground' : 'truncate'}>
            {row.email}
          </span>
          <span className={stacked ? 'block text-xs leading-relaxed text-muted-foreground' : 'shrink-0 text-muted-foreground'}>
            {row.meta}
          </span>
        </li>
      ))}
    </ul>
  )
}
