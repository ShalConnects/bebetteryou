'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { traditionIds, translationsFor } from '@/config/traditions'
import { quoteShowsScripture, scriptureFor } from '@/libs/scripture-core'

const STORAGE = 'bby-tradition'
const SKIP = 'bby-tradition-skip'
const SHOW = 'bby-scripture-show'
const TRANS = 'bby-translation'

const Ctx = createContext(null)

async function fetchPrefs() {
  const res = await fetch('/api/user/tradition')
  if (!res.ok) throw new Error('fetch failed')
  return res.json()
}

async function savePrefs(body) {
  const res = await fetch('/api/user/tradition', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('save failed')
}

export function TraditionProvider({ children }) {
  const { status } = useSession()
  const [tradition, setTradition] = useState(null)
  const [showPassages, setShowPassages] = useState(true)
  const [translation, setTranslation] = useState('niv')
  const [scriptureBook, setScriptureBook] = useState(null)
  const [promptOpen, setPromptOpen] = useState(false)
  const [syncError, setSyncError] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE)
    const skipped = localStorage.getItem(SKIP) === '1'
    setTradition(stored && traditionIds.has(stored) ? stored : null)
    setShowPassages(localStorage.getItem(SHOW) !== '0')
    setTranslation(localStorage.getItem(TRANS) || 'niv')
    setPromptOpen(!skipped && !stored)
    fetch('/api/scripture')
      .then((r) => r.json())
      .then((d) => setScriptureBook(d.data || null))
      .catch(() => {})
      .finally(() => setReady(true))
  }, [])

  useEffect(() => {
    if (!ready || status !== 'authenticated') return
    let cancelled = false
    ;(async () => {
      try {
        const remote = await fetchPrefs()
        if (cancelled) return
        setSyncError(false)
        if (remote.tradition) {
          localStorage.setItem(STORAGE, remote.tradition)
          setTradition(remote.tradition)
        }
        setShowPassages(remote.showPassages !== false)
        localStorage.setItem(SHOW, remote.showPassages === false ? '0' : '1')
        if (remote.translation) {
          setTranslation(remote.translation)
          localStorage.setItem(TRANS, remote.translation)
        }
        const local = localStorage.getItem(STORAGE)
        if (local && traditionIds.has(local) && !remote.tradition) await savePrefs({ tradition: local })
      } catch {
        if (!cancelled) setSyncError(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [ready, status])

  const sync = useCallback(
    async (body) => {
      if (status !== 'authenticated') return
      try {
        await savePrefs(body)
        setSyncError(false)
      } catch {
        setSyncError(true)
      }
    },
    [status]
  )

  const pick = useCallback(
    (id) => {
      if (!traditionIds.has(id)) return
      localStorage.setItem(STORAGE, id)
      localStorage.setItem(SKIP, '1')
      setTradition(id)
      // Changing an existing choice keeps the dialog open to adjust the rest.
      if (!tradition) setPromptOpen(false)
      sync({ tradition: id })
    },
    [sync, tradition]
  )

  const dismiss = useCallback(() => {
    localStorage.setItem(SKIP, '1')
    setPromptOpen(false)
  }, [])

  const openPicker = useCallback(() => setPromptOpen(true), [])

  const togglePassages = useCallback(() => {
    setShowPassages((on) => {
      const next = !on
      localStorage.setItem(SHOW, next ? '1' : '0')
      sync({ showPassages: next })
      return next
    })
  }, [sync])

  const setTranslationPref = useCallback(
    (id) => {
      if (!translationsFor('christianity').some((t) => t.id === id)) return
      localStorage.setItem(TRANS, id)
      setTranslation(id)
      sync({ translation: id })
    },
    [sync]
  )

  return (
    <Ctx.Provider
      value={{
        tradition,
        showPassages,
        translation,
        scriptureBook,
        ready,
        promptOpen,
        syncError,
        pick,
        dismiss,
        openPicker,
        togglePassages,
        setTranslationPref,
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useTradition() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useTradition requires TraditionProvider')
  return ctx
}

export function useScriptureQuote({ tags, slug, n }) {
  const { tradition, showPassages, translation, scriptureBook, ready } = useTradition()
  return useMemo(() => {
    if (!ready || !showPassages || !scriptureBook || !quoteShowsScripture(tags)) return null
    if (!tradition || tradition === 'none') return null
    const translationId = translationsFor(tradition).length ? translation : null
    return scriptureFor(scriptureBook, tradition, tags, slug ?? n, translationId)
  }, [ready, showPassages, scriptureBook, tradition, translation, tags, slug, n])
}
