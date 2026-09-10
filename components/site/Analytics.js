'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { trackPageview } from '@/libs/analytics-client'

/**
 * Fires one pageview per route. Mounted inside the public shell only, so the
 * admin dashboard never shows up in its own numbers.
 */
export default function Analytics() {
  const pathname = usePathname()
  /** Guards React's double-invoked effects in dev and repeated renders alike. */
  const sent = useRef('')

  useEffect(() => {
    if (!pathname || sent.current === pathname) return
    sent.current = pathname
    trackPageview(pathname)
  }, [pathname])

  return null
}
