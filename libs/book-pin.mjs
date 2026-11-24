import { createCanvas, loadImage } from '@napi-rs/canvas'
import { quoteCard } from '../config/quote-card.js'
import { registerFonts, wrapLines } from './canvas-text.mjs'

/** Pinterest's preferred 2:3 portrait. */
const W = 1000
const H = 1500
const PAPER = 'rgb(233,253,240)'
const QUIET = 'rgb(122,158,134)'
const ACCENT = 'rgb(52,211,153)'

function lines(ctx, text, font, color, maxWidth, y, lineHeight, maxLines) {
  ctx.font = font
  ctx.fillStyle = color
  const rows = wrapLines(ctx, text, maxWidth).slice(0, maxLines)
  rows.forEach((row, i) => ctx.fillText(row, W / 2, y + i * lineHeight))
  return y + rows.length * lineHeight
}

/** Book-of-the-week pin: label, cover, title, one-line blurb, site. Returns a JPEG buffer. */
export async function renderBookPin(coverBuffer, book) {
  registerFonts()
  const canvas = createCanvas(W, H)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = quoteCard.bg
  ctx.fillRect(0, 0, W, H)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'

  ctx.font = '34px Jost'
  ctx.fillStyle = ACCENT
  ctx.fillText('B O O K   O F   T H E   W E E K', W / 2, 110)

  const cover = await loadImage(coverBuffer)
  const cw = 540
  const ch = Math.round((cover.height / cover.width) * cw)
  const cx = (W - cw) / 2
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.6)'
  ctx.shadowBlur = 40
  ctx.shadowOffsetY = 18
  ctx.drawImage(cover, cx, 160, cw, ch)
  ctx.restore()

  let y = 160 + ch + 100
  y = lines(ctx, book.title, '58px NovaRound', PAPER, 860, y, 70, 2)
  if (book.author) y = lines(ctx, book.author, '34px Jost', QUIET, 860, y + 6, 44, 1)
  if (book.blurb) lines(ctx, book.blurb, '38px Jost', PAPER, 820, y + 40, 50, 2)

  ctx.font = '30px Jost'
  ctx.fillStyle = QUIET
  ctx.fillText('bebetteryou.online/books', W / 2, H - 60)
  return canvas.toBuffer('image/jpeg', 90)
}
