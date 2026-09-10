import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import path from 'path'

/** Text primitives shared by the social card and the print artwork renderers. */

/** `process.cwd()` — `import.meta.url` is not a valid file URL on Vercel. */
const fontDir = path.join(process.cwd(), 'assets/fonts')
/** Exported so a type preset naming an unregistered face fails a test, not a print. */
export const fontFiles = {
  BungeeShade: 'BungeeShade-Regular.ttf',
  NovaRound: 'NovaRound-Regular.woff',
  Jost: 'Jost-Regular.woff',
  /** Print type presets; see config/print-styles.js. */
  Bungee: 'Bungee-Regular.ttf',
  Comfortaa: 'Comfortaa.ttf',
}

let fontsReady = false
export function registerFonts() {
  if (fontsReady) return
  for (const [family, file] of Object.entries(fontFiles)) {
    GlobalFonts.registerFromPath(path.join(fontDir, file), family)
  }
  fontsReady = true
}

/** Throwaway 1×1 context for measuring without allocating a full canvas. */
export function measureContext() {
  return createCanvas(1, 1).getContext('2d')
}

export function capitalizeFirstWord(text) {
  return String(text).replace(/^(\s*)(\S)(\S*)/, (_, sp, first, rest) => sp + first.toUpperCase() + rest)
}

/** Greedy wrap against the context's current font; explicit newlines are kept. */
export function wrapLines(ctx, text, maxWidth) {
  const out = []
  for (const block of String(text).split(/\n/)) {
    const words = block.trim().split(/\s+/).filter(Boolean)
    if (!words.length) {
      out.push('')
      continue
    }
    let line = words[0]
    for (let i = 1; i < words.length; i++) {
      const next = `${line} ${words[i]}`
      if (ctx.measureText(next).width <= maxWidth) line = next
      else {
        out.push(line)
        line = words[i]
      }
    }
    out.push(line)
  }
  return out
}
