'use client'

import { useEffect, useState } from 'react'

/** Thin mint bar at the top of the window, 0→100% as the page scrolls. */
export default function ReadingProgress() {
  const [p, setP] = useState(0)
  useEffect(() => {
    const on = () => {
      const max = document.documentElement.scrollHeight - innerHeight
      setP(max > 0 ? scrollY / max : 0)
    }
    on()
    addEventListener('scroll', on, { passive: true })
    return () => removeEventListener('scroll', on)
  }, [])
  return <div className="pv-progress" style={{ transform: `scaleX(${p})` }} aria-hidden />
}
