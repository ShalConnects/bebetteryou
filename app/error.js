'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { Page } from '@/components/site/ui'

/** Same look as the 404: a calm line and a way back, not a stack trace. */
export default function Error({ error, reset }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <Page className="items-center justify-center py-20 text-center">
      <h1 className="font-display text-3xl tracking-wide text-paper md:text-4xl">Something slipped.</h1>
      <p className="lede mx-auto mt-3 max-w-sm">Give it another go — it usually works the second time.</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
        <button type="button" onClick={reset} className="btn bg-accent text-accent-ink hover:bg-accent/90">
          Try again
        </button>
        <Link href="/" className="tag">
          Home
        </Link>
      </div>
    </Page>
  )
}
