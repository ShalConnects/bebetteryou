'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function ImportSubscribers() {
  const router = useRouter()
  const [csv, setCsv] = useState('')
  const [fileName, setFileName] = useState('')
  const [confirmedOptIn, setConfirmedOptIn] = useState(false)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')

  async function onFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    setCsv(text)
    setFileName(file.name)
    setResult('')
    setError('')
  }

  async function onImport() {
    if (!csv.trim()) {
      setError('Paste emails or choose a CSV file.')
      return
    }
    if (!confirmedOptIn) {
      setError('Confirm every address already opted in before importing.')
      return
    }
    setBusy(true)
    setError('')
    setResult('')
    try {
      const res = await fetch('/api/newsletter/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv, confirmedOptIn: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Import failed')
      const bits = [
        `Imported ${data.total}`,
        `${data.created} new`,
        `${data.updated} updated`,
      ]
      if (data.invalidCount) bits.push(`${data.invalidCount} skipped (invalid)`)
      setResult(bits.join(' · '))
      setCsv('')
      setFileName('')
      setConfirmedOptIn(false)
      router.refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-quiet">
        CSV with an <code className="text-paper">email</code> column (optional{' '}
        <code className="text-paper">quotes</code>, <code className="text-paper">blog</code>,{' '}
        <code className="text-paper">books</code>), or one email per line. Only people who already
        opted in. Does not send welcome mail.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <label className="btn cursor-pointer">
          Choose CSV
          <input type="file" accept=".csv,text/csv,text/plain" className="hidden" onChange={onFile} />
        </label>
        {fileName ? <span className="text-sm text-quiet">{fileName}</span> : null}
      </div>

      <textarea
        className="min-h-[8rem] w-full resize-y border border-line bg-ink px-4 py-3 font-mono text-sm text-paper outline-none focus:border-paper/40"
        placeholder={'email\nperson@example.com\nother@example.com'}
        value={csv}
        onChange={(e) => {
          setCsv(e.target.value)
          setFileName('')
        }}
      />

      <label className="flex items-start gap-3 text-sm text-body">
        <input
          type="checkbox"
          className="mt-1"
          checked={confirmedOptIn}
          onChange={(e) => setConfirmedOptIn(e.target.checked)}
        />
        <span>
          I confirm every address on this list already opted in to BeBetterYou email (not a bought or
          scraped list).
        </span>
      </label>

      <button type="button" className="btn disabled:opacity-50" disabled={busy} onClick={onImport}>
        {busy ? 'Importing…' : 'Import subscribers'}
      </button>

      {result ? <p className="text-sm text-body">{result}</p> : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  )
}
