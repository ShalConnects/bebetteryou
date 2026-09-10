'use client'

import Image from 'next/image'
import { useEffect, useRef } from 'react'
import { inkBlendMode } from '@/libs/print-format'
import { paintCylinder } from '@/libs/print-preview'

/** Form and preview primitives shared by the design and shipping steps. */

export const field =
  'w-full min-w-0 border border-line bg-ink px-4 py-3 text-paper outline-none focus:border-paper/40'
export const legend = 'text-[11px] uppercase tracking-[0.2em] text-quiet'

export function Row({ label, children }) {
  return (
    <label className="block">
      <span className={legend}>{label}</span>
      <span className="mt-2 block">{children}</span>
    </label>
  )
}

/**
 * Radio semantics rather than a row of buttons, so a screen reader announces the
 * choice as one of a set and reports which one is taken.
 */
export function Choice({ label, options, value, onChange }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-5">
      {options.map((option) => {
        const id = option.id ?? option
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={id === value}
            onClick={() => onChange(id)}
            className={id === value ? 'tag-active' : 'tag'}
          >
            {option.label ?? option}
          </button>
        )
      })}
    </div>
  )
}

function CylinderArt({ src, alt, style }) {
  const box = useRef(null)
  const canvas = useRef(null)

  useEffect(() => {
    const host = box.current
    if (!host) return
    const img = new window.Image()
    let alive = true
    const draw = () => {
      const el = canvas.current
      if (!alive || !el || !img.naturalWidth || !host.clientWidth) return
      const w = Math.round(host.clientWidth * 2)
      const h = Math.round(host.clientHeight * 2)
      el.width = w
      el.height = h
      paintCylinder(el.getContext('2d'), img, w, h)
    }
    img.onload = draw
    img.src = src
    const ro = new ResizeObserver(draw)
    ro.observe(host)
    return () => {
      alive = false
      ro.disconnect()
    }
  }, [src])

  return (
    <span ref={box} className="absolute inset-0">
      <canvas ref={canvas} className="h-full w-full" style={style} aria-label={alt} />
    </span>
  )
}

/**
 * Blank plus artwork, composited two different ways.
 *
 * A Printful blank is a semi-transparent garment over the colour it hands us,
 * with a hole where the print goes, so the artwork belongs *under* it and the
 * garment's own shading falls across the print for free.
 *
 * A bundled blank is an opaque photograph, so the artwork goes on top and has
 * to be blended into the fabric instead. Either way nothing here decides what
 * gets printed, only how it reads on screen.
 */
export function Preview({ product, swatch, placement, blank, design, alt }) {
  const frame = blank?.frame || placement?.frame
  const mockup = blank?.image || swatch?.mockup
  const under = Boolean(blank?.overlay)

  const blend = under ? undefined : { mixBlendMode: inkBlendMode(swatch?.ink), opacity: 0.94 }
  const art = design?.url && frame ? (
    <span
      className="absolute"
      style={{
        top: `${frame.top}%`,
        left: `${frame.left}%`,
        width: `${frame.width}%`,
        height: `${frame.height}%`,
      }}
    >
      {product.curve ? (
        <CylinderArt src={design.url} alt={alt} style={blend} />
      ) : (
        <Image
          src={design.url}
          alt={alt}
          fill
          className="object-contain"
          sizes="40vw"
          unoptimized
          style={blend}
        />
      )}
    </span>
  ) : null

  return (
    <div className="relative isolate aspect-square w-full overflow-hidden border border-line bg-ink-soft">
      {blank?.backgroundColor ? (
        <span className="absolute inset-0" style={{ backgroundColor: blank.backgroundColor }} />
      ) : null}
      {under ? art : null}
      {mockup ? (
        <Image
          src={mockup}
          alt={product.name}
          fill
          className="object-contain"
          sizes="(max-width:768px) 100vw, 40vw"
          unoptimized={Boolean(blank?.image)}
        />
      ) : null}
      {under ? null : art}
    </div>
  )
}
