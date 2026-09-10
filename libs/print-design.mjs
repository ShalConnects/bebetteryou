import { createCanvas } from '@napi-rs/canvas'
import { capitalizeFirstWord, measureContext, registerFonts, wrapLines } from './canvas-text.mjs'

/**
 * Print artwork: quote text on transparency at print resolution. Deliberately
 * none of the social card's chrome (background, grain, serial chip, site credit)
 * — a print file must carry only the art that goes on the garment.
 */
export const printDesign = {
  font: 'NovaRound',
  metaFont: 'Jost',
  /** Type scale and padding track the shorter edge so wide (mug) and tall
      (tee) print areas both stay inside the safe box. The scale starts
      deliberately large and `fitText` shrinks it down, so the art fills the
      print area instead of floating in it like a decal. */
  sizeRatio: 0.2,
  metaRatio: 0.1,
  lineHeight: 1.32,
  padRatio: 0.08,
  creditGap: 1.9,
  /** Shrink step used to fit the wrapped block into the print height. */
  shrink: 0.93,
  /**
   * Print files are 300dpi, and Printful warn that fine detail much below a
   * fifth of an inch closes up in DTG and sublimation. Shrinking stops here
   * rather than at a fraction of the starting size, which is what previously let
   * a long quote overflow the print area instead of being refused.
   */
  dpi: 300,
  minInches: 0.2,
}

/**
 * Largest font size at which the wrapped quote still fits the print box, and
 * whether it fits at all. Callers must honour `fits`: at the floor the block can
 * still be taller than the box, and printing that would push art outside the
 * print area.
 */
function fitText(ctx, { text, credit, maxW, maxH, base, design }) {
  const { font, lineHeight, metaRatio, sizeRatio, creditGap, shrink, dpi, minInches } = design
  // The credit sets at a fraction of the quote, so it is the first to go
  // illegible — raise the floor by that fraction whenever there is one.
  const smallest = dpi * minInches
  const floor = credit ? smallest * (sizeRatio / metaRatio) : smallest
  let size = Math.max(base, floor)

  for (;;) {
    ctx.font = `${size}px ${font}`
    const lines = wrapLines(ctx, text, maxW)
    const metaSize = size * (metaRatio / sizeRatio)
    const height = lines.length * size * lineHeight + (credit ? metaSize * creditGap : 0)
    const fits = height <= maxH
    if (fits || size <= floor) return { lines, size, metaSize, height, fits }
    size = Math.max(size * shrink, floor)
  }
}

/**
 * Layout without paint. `style` overrides the defaults above — a preset from
 * config/print-styles.js, resolved only by the caller, so an unknown id can
 * never reach the canvas.
 *
 * Exported because the fitted type size is what decides whether a preset still
 * prints legibly at 300dpi, and asserting that should not cost a full render.
 * The renderer builds on it so there is one fit path rather than two.
 */
export function measurePrintFile({ text, author = '', width, height, style }) {
  registerFonts()
  const design = { ...printDesign, ...style }
  const short = Math.min(width, height)
  const pad = short * design.padRatio
  const credit = String(author || '').trim()

  const fitted = fitText(measureContext(), {
    text: capitalizeFirstWord(text),
    credit,
    maxW: width - pad * 2,
    maxH: height - pad * 2,
    base: short * design.sizeRatio,
    design,
  })

  return { design, credit, fitted }
}

/**
 * @param {{ text: string, author?: string, width: number, height: number, ink?: string, style?: object }} opts
 * @returns {Promise<Buffer>} transparent PNG
 */
export async function renderPrintFile({ text, author = '', width, height, ink = '#111111', style }) {
  const { design, credit, fitted } = measurePrintFile({ text, author, width, height, style })
  const { font, metaFont, lineHeight, creditGap } = design

  if (!fitted.fits) {
    // Refusing beats printing outside the print area. `status` is honoured by
    // handleApiError, so the caller shows this text rather than a 500.
    const error = new Error('This quote is too long to print legibly on that product.')
    error.status = 422
    throw error
  }

  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')

  const line = fitted.size * lineHeight
  let y = (height - fitted.height) / 2 + line / 2

  ctx.fillStyle = ink
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `${fitted.size}px ${font}`
  for (const row of fitted.lines) {
    ctx.fillText(row, width / 2, y)
    y += line
  }

  if (credit) {
    ctx.font = `${fitted.metaSize}px ${metaFont}`
    ctx.fillText(`— ${credit}`, width / 2, y + fitted.metaSize * (creditGap - 1))
  }

  return canvas.toBuffer('image/png')
}
