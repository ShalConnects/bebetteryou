'use client'

import { useLinkStatus } from 'next/link'

/** Dot inside a Link while its page loads — tab switches only change search params, so no loading.js shows. */
export default function LinkPending() {
  const { pending } = useLinkStatus()
  return pending ? <span className="ml-1.5 inline-block size-1.5 animate-pulse rounded-full bg-primary" aria-hidden /> : null
}
