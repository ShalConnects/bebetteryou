'use client'

import { useEffect, useState } from 'react'

const delayMs = 500

/** Debounced card preview — returns wrapped `lines` from the renderer. */
export function useQuotePreview(text, author) {
  const [preview, setPreview] = useState(null)
  const [previewing, setPreviewing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const trimmed = text.trim()
    if (!trimmed) {
      setPreview(null)
      setError('')
      return
    }

    const ctrl = new AbortController()
    const timer = setTimeout(async () => {
      setPreviewing(true)
      try {
        const res = await fetch('/api/quotes/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: trimmed, author }),
          signal: ctrl.signal,
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Preview failed')
        setPreview(data)
        setError('')
      } catch (err) {
        if (err.name !== 'AbortError') setError(err.message)
      } finally {
        if (!ctrl.signal.aborted) setPreviewing(false)
      }
    }, delayMs)

    return () => {
      clearTimeout(timer)
      ctrl.abort()
    }
  }, [text, author])

  return { preview, previewing, error, setError }
}
