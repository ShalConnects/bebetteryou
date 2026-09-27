'use client'

import { useEffect, useState } from 'react'

/** Tiny toast bus — `toast('Saved')` anywhere in the dashboard. */
export function toast(message) {
  if (typeof window === 'undefined' || !message) return
  window.dispatchEvent(new CustomEvent('bby-toast', { detail: String(message) }))
}

export function ToastHost() {
  const [msg, setMsg] = useState('')
  useEffect(() => {
    let timer
    function onToast(e) {
      setMsg(e.detail || '')
      clearTimeout(timer)
      timer = setTimeout(() => setMsg(''), 2800)
    }
    window.addEventListener('bby-toast', onToast)
    return () => {
      window.removeEventListener('bby-toast', onToast)
      clearTimeout(timer)
    }
  }, [])
  if (!msg) return null
  return (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 z-[60] max-w-[min(92vw,24rem)] -translate-x-1/2 border border-line bg-ink px-4 py-3 text-sm text-paper shadow-lg"
    >
      {msg}
    </div>
  )
}
