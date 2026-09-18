import { createCanvas, loadImage } from '@napi-rs/canvas'
import path from 'path'
import { brand } from '../config/site.js'
import { getSiteLabel } from '../libs/site-url.js'
import { cardRevision, quoteCard } from '../config/quote-card.js'
import { capitalizeFirstWord, measureContext, registerFonts, wrapLines } from './canvas-text.mjs'

export { cardRevision, quoteCard }

/** `process.cwd()` — `import.meta.url` is not a valid file URL on Vercel. */
const root = process.cwd()
const layerDir = path.join(root, 'assets/quote-card')

let layersReady
async function ensureLayers() {
  if (layersReady) return layersReady
  const markPath = path.join(root, 'public', brand.mark.replace(/^\//, ''))
  const { bg, grain } = quoteCard.layers
  layersReady = {
    bg: await loadImage(path.join(layerDir, bg)),
    grain: await loadImage(path.join(layerDir, grain)),
    mark: await loadImage(markPath),
  }
  return layersReady
}

/** Same wrap as draw — returns visual row count. */
export function countQuoteLines(text) {
  registerFonts()
  const { width: w, padX, quote } = quoteCard
  return layoutQuote(measureContext(), text, quote, w - padX * 2).rows
}

export function assertQuoteFits(text) {
  const lines = countQuoteLines(text)
  const { maxLines } = quoteCard.quote
  if (lines > maxLines) throw new Error(`Quote wraps to ${lines} lines; max is ${maxLines}`)
  return lines
}

function layoutQuote(ctx, text, { font, size, firstCharSize }, maxW) {
  const body = capitalizeFirstWord(text)
  const first = body[0] || ''
  const after = body.slice(1)
  const big = firstCharSize || size

  ctx.font = `${big}px ${font}`
  const firstW = first ? ctx.measureText(first).width : 0
  ctx.font = `${size}px ${font}`

  const [head = '', ...tail] = after.split(/\n/)
  const words = head.split(/\s+/).filter(Boolean)
  const available = maxW - firstW
  let lead = ''
  let i = 0
  for (; i < words.length; i++) {
    const next = i === 0 ? words[i] : `${lead} ${words[i]}`
    if (ctx.measureText(next).width > available && lead) break
    lead = next
  }
  const leftover = [words.slice(i).join(' '), ...tail].filter(Boolean).join('\n')
  const restLines = leftover ? wrapLines(ctx, leftover, maxW) : []
  return { first, firstW, lead, restLines, rows: 1 + restLines.length, font, size, big }
}

/** Cover-fit image into w×h (center crop). */
function drawCover(ctx, img, w, h) {
  const scale = Math.max(w / img.width, h / img.height)
  const dw = img.width * scale
  const dh = img.height * scale
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh)
}

function drawBackdrop(ctx, w, h, layers, { grainOpacity, bgOverlay, bgOverlayColor = '#000000' }) {
  drawCover(ctx, layers.bg, w, h)
  if (grainOpacity) {
    ctx.save()
    ctx.globalAlpha = grainOpacity
    drawCover(ctx, layers.grain, w, h)
    ctx.restore()
  }
  if (bgOverlay) {
    ctx.save()
    ctx.globalAlpha = bgOverlay
    ctx.fillStyle = bgOverlayColor
    ctx.fillRect(0, 0, w, h)
    ctx.restore()
  }
}

/** Top bar: Be-in-circle (left) + #n (right), vertically centered in sectionH. */
function drawTopChrome(ctx, n, w, sectionH, padX, mark, { size, font, color, circle, circleScale }) {
  const y = sectionH / 2
  const diameter = size * circleScale
  const cx = padX + diameter / 2

  ctx.beginPath()
  ctx.arc(cx, y, diameter / 2, 0, Math.PI * 2)
  ctx.fillStyle = circle
  ctx.fill()

  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, y, diameter / 2, 0, Math.PI * 2)
  ctx.clip()
  ctx.globalCompositeOperation = 'screen'
  ctx.drawImage(mark, cx - size / 2, y - size / 2, size, size)
  ctx.restore()

  ctx.font = `${size}px ${font}`
  ctx.fillStyle = color
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  ctx.fillText(`#${n}`, w - padX, y)
}

function drawMeta(ctx, w, h, sectionH, footerH, site, author, meta) {
  const credit = String(author || '').trim()
  const lines = credit ? [`— ${credit}`, site] : [site]
  const gap = meta.size * meta.lineHeight
  const blockH = lines.length * gap
  let y = h - footerH + sectionH / 2 - blockH / 2 + gap / 2

  ctx.font = `${meta.size}px ${meta.font}`
  ctx.fillStyle = meta.color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (const row of lines) {
    ctx.fillText(row, w / 2, y)
    y += gap
  }
}

function drawQuoteBlock(ctx, w, h, sectionH, footerH, text, quote, padX, reveal) {
  const maxW = w - padX * 2
  const line = quote.size * quote.lineHeight
  const chunks = String(text ?? '').split(/\n/)
  const visible = reveal == null ? text : chunks.slice(0, reveal).join('\n')
  const full = layoutQuote(ctx, text, quote, maxW)
  const { first, firstW, lead, restLines, font, size, big } = layoutQuote(ctx, visible || text, quote, maxW)
  const mid = sectionH + (h - sectionH - footerH) / 2
  let y = mid - (full.rows * line) / 2 + line / 2

  ctx.fillStyle = quote.color
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'

  ctx.font = `${size}px ${font}`
  const leadW = lead ? ctx.measureText(lead).width : 0
  let x = (w - (firstW + leadW)) / 2
  if (first) {
    ctx.font = `${big}px ${font}`
    ctx.fillText(first, x, y)
    x += firstW
  }
  if (lead) {
    ctx.font = `${size}px ${font}`
    ctx.fillText(lead, x, y)
  }
  y += line

  ctx.textAlign = 'center'
  ctx.font = `${size}px ${font}`
  for (const row of restLines) {
    ctx.fillText(row, w / 2, y)
    y += line
  }
}

/**
 * Render a quote card to a JPEG buffer.
 * @param {{ n: number, text: string, author?: string, card?: typeof quoteCard, reveal?: number }} quote
 */
export async function renderQuoteCard({ n, text, author = '', card = quoteCard, reveal } = {}) {
  registerFonts()
  const layers = await ensureLayers()
  const { width: w, height: h, bg, padX, sectionH, footerH = sectionH, number, quote, meta } = card
  const site = getSiteLabel()
  const canvas = createCanvas(w, h)
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)
  drawBackdrop(ctx, w, h, layers, card.layers || quoteCard.layers)
  drawTopChrome(ctx, n, w, sectionH, padX, layers.mark, number)
  drawQuoteBlock(ctx, w, h, sectionH, footerH, text, quote, padX, reveal)
  drawMeta(ctx, w, h, sectionH, footerH, site, author, meta)

  return canvas.toBuffer('image/jpeg', 92)
}
