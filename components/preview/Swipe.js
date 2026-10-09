'use client'

import { useRouter } from 'next/navigation'
import { useRef } from 'react'

/** Horizontal swipe → prev/next href (touch only; arrows still work everywhere). */
export default function Swipe({ prev, next, children }) {
  const router = useRouter()
  const x0 = useRef(null)
  function end(e) {
    const dx = e.changedTouches[0].clientX - (x0.current ?? 0)
    const to = dx > 60 ? prev : dx < -60 ? next : null
    if (x0.current != null && to) router.push(to)
    x0.current = null
  }
  return (
    <div onTouchStart={(e) => (x0.current = e.touches[0].clientX)} onTouchEnd={end} className="touch-pan-y">
      {children}
    </div>
  )
}
