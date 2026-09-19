'use client'

import { useEffect } from 'react'
import {
  mergePracticeState,
  pushPracticeState,
  readPracticeState,
  replacePracticeState,
  setPracticeCloud,
} from '@/libs/practice-store'

/** Pull/push Practice state for signed-in DB users. No-op for guests. */
export default function PracticeSync() {
  useEffect(() => {
    let cancelled = false

    async function sync() {
      try {
        const res = await fetch('/api/user/practice')
        if (!res.ok) return
        const data = await res.json()
        if (!data?.synced || cancelled) return

        setPracticeCloud(true)
        const merged = mergePracticeState(readPracticeState(), data.state)
        replacePracticeState(merged)
        pushPracticeState(merged)
      } catch {
        /* offline / signed out */
      }
    }

    sync()
    return () => {
      cancelled = true
    }
  }, [])

  return null
}
