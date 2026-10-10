'use client'

import { useEffect, useRef } from 'react'

/** Muted background loop. Loads only on desktop with motion allowed; everyone else sees the poster. */
export default function HeroVideo({ src, poster }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!matchMedia('(min-width: 768px) and (prefers-reduced-motion: no-preference)').matches) return
    ref.current.src = src
    ref.current.play().catch(() => {})
  }, [src])
  return <video ref={ref} poster={poster} muted loop playsInline aria-hidden className="hero-video" />
}
