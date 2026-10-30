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
const WEEK = 7 * 24 * 60 * 60 * 1000

/** Storage can throw (private mode, blocked cookies) — prefs then just don't persist. */
const store = {
  get: (k) => {
    try {
      return localStorage.getItem(k)
    } catch {
      return null
    }
  },
  set: (k, v) => {
    try {
      localStorage.setItem(k, v)
    } catch {}
  },
}

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
  const [tagThemesMap, setTagThemesMap] = useState(null)
  const [promptOpen, setPromptOpen] = useState(false)
  const [syncError, setSyncError] = useState(false)
  const [ready, setReady] = useState(false)
  /** Per-quote "Another passage" steps, shared so share text matches what's on screen. */
  const [offsets, setOffsets] = useState({})
  const nextPassage = useCallback((key) => setOffsets((o) => ({ ...o, [key]: (o[key] || 0) + 1 })), [])

  useEffect(() => {
    const stored = store.get(STORAGE)
    // '1' = skipped for good; a timestamp = "maybe later" until then.
    const skip = store.get(SKIP)
    setTradition(stored && traditionIds.has(stored) ? stored : null)
    setShowPassages(store.get(SHOW) !== '0')
    setTranslation(store.get(TRANS) || 'niv')
    setPromptOpen(!stored && skip !== '1' && !(Number(skip) > Date.now()))
    setReady(true)
  }, [])

  // The passage book is only worth downloading once a reader has picked a tradition.
  const wantsBook = Boolean(tradition && tradition !== 'none')
  useEffect(() => {
    if (!wantsBook || scriptureBook) return
    fetch('/api/scripture')
      .then((r) => r.json())
      .then((d) => {
        setScriptureBook(d.data || null)
        if (d.themes) setTagThemesMap(d.themes)
      })
      .catch(() => {})
  }, [wantsBook, scriptureBook])

  useEffect(() => {
    if (!ready || status !== 'authenticated') return
    let cancelled = false
    ;(async () => {
      try {
        const remote = await fetchPrefs()
        if (cancelled) return
        setSyncError(false)
        if (remote.tradition) {
          store.set(STORAGE, remote.tradition)
          setTradition(remote.tradition)
        }
        setShowPassages(remote.showPassages !== false)
        store.set(SHOW, remote.showPassages === false ? '0' : '1')
        if (remote.translation) {
          setTranslation(remote.translation)
          store.set(TRANS, remote.translation)
        }
        const local = store.get(STORAGE)
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
      store.set(STORAGE, id)
      store.set(SKIP, '1')
      setTradition(id)
      // Changing an existing choice keeps the dialog open to adjust the rest.
      if (!tradition) setPromptOpen(false)
      sync({ tradition: id })
    },
    [sync, tradition]
  )

  /** forever = "Skip"; otherwise ask again in a week. */
  const dismiss = useCallback((forever = true) => {
    store.set(SKIP, forever ? '1' : String(Date.now() + WEEK))
    setPromptOpen(false)
  }, [])

  const openPicker = useCallback(() => setPromptOpen(true), [])

  const togglePassages = useCallback(() => {
    setShowPassages((on) => {
      const next = !on
      store.set(SHOW, next ? '1' : '0')
      sync({ showPassages: next })
      return next
    })
  }, [sync])

  const setTranslationPref = useCallback(
    (id) => {
      if (!translationsFor('christianity').some((t) => t.id === id)) return
      store.set(TRANS, id)
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
        tagThemesMap,
        ready,
        promptOpen,
        syncError,
        pick,
        dismiss,
        openPicker,
        togglePassages,
        setTranslationPref,
        offsets,
        nextPassage,
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

export function useScriptureQuote({ tags, slug, n, theme }) {
  const { tradition, showPassages, translation, scriptureBook, tagThemesMap, ready, offsets } = useTradition()
  const key = slug ?? n
  const offset = offsets[key] || 0
  return useMemo(() => {
    if (!ready || !showPassages || !scriptureBook || !quoteShowsScripture(tags, theme, tagThemesMap)) return null
    if (!tradition || tradition === 'none') return null
    const translationId = translationsFor(tradition).length ? translation : null
    return scriptureFor(scriptureBook, tradition, tags, key, translationId, theme, tagThemesMap, offset)
  }, [ready, showPassages, scriptureBook, tagThemesMap, tradition, translation, tags, key, theme, offset])
}
