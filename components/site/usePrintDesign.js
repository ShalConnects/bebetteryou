'use client'

import { useEffect, useRef, useState } from 'react'
import { postJson } from '@/libs/print-client'

/**
 * Renders the artwork for a selection and reports progress.
 *
 * Both steps go through the design route rather than rendering on the server
 * during a page request: that route is rate limited, and print files are stored
 * permanently, so it stays the only path that can create them.
 */
export function usePrintDesign({ slug, productId, color, size, style, leading, scale, credit, text, author }) {
  const [design, setDesign] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Artwork depends on the quote, product, ink colour, type preset and — for mug
  // wraps, whose print area changes shape between sizes — the size.
  const lastProduct = useRef(productId)
  const cache = useRef(new Map())
  useEffect(() => {
    if (!color || !size) return
    let active = true
    const key = [slug, productId, color, size, style, leading, scale, credit, text, author].join('\0')

    // Art from a previous product belongs to a different print box, so drop it.
    // Cleared here rather than in an effect of its own, so the clear and the
    // refetch cannot come apart and leave the preview permanently blank.
    if (lastProduct.current !== productId) {
      lastProduct.current = productId
      setDesign(null)
    }

    const hit = cache.current.get(key)
    if (hit) {
      setDesign(hit)
      setError('')
      setBusy(false)
      return
    }

    setBusy(true)
    setError('')
    // Wait out rapid type/colour clicks so only the last selection renders.
    const timer = setTimeout(() => {
      postJson('/api/print/design', { slug, productId, color, size, style, leading, scale, credit, text, author })
        .then(({ ok, data }) => {
          if (!active) return
          if (ok) {
            cache.current.set(key, data)
            return setDesign(data)
          }
          // Drop the old art too: leaving it up would show something other than
          // what this selection actually prints.
          setDesign(null)
          setError(data.error || 'Could not render the design.')
        })
        .finally(() => active && setBusy(false))
    }, 160)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [slug, productId, color, size, style, leading, scale, credit, text, author])

  return { design, busy, error }
}
