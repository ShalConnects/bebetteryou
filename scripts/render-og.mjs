/**
 * Render the default Open Graph / WhatsApp share card (1200×630).
 * Uses the homepage hero pitch from config/site.js.
 * Usage: node scripts/render-og.mjs
 */
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas'
import fs from 'fs'
import path from 'path'
import { brand } from '../config/site.js'
import { heroLine, heroSub } from '../config/pitch.js'
import { quoteCard } from '../config/quote-card.js'

const W = 1200
const H = 630
const root = process.cwd()
const outPath = path.join(root, 'public/brand/og.png')

GlobalFonts.registerFromPath(path.join(root, 'assets/fonts/Iceberg-Regular.ttf'), 'Iceberg')
GlobalFonts.registerFromPath(path.join(root, 'assets/fonts/Jost-Regular.woff'), 'Jost')

function drawCover(ctx, img, w, h) {
  const scale = Math.max(w / img.width, h / img.height)
  const dw = img.width * scale
  const dh = img.height * scale
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh)
}

function wrapCentered(ctx, text, maxWidth) {
  const words = String(text).split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else line = next
  }
  if (line) lines.push(line)
  return lines
}

const domain = 'bebetteryou.online'

const bg = await loadImage(path.join(root, 'assets/quote-card', quoteCard.layers.bg))
const grain = await loadImage(path.join(root, 'assets/quote-card', quoteCard.layers.grain))
const mark = await loadImage(path.join(root, 'assets/brand/chip.png'))

const canvas = createCanvas(W, H)
const ctx = canvas.getContext('2d')

drawCover(ctx, bg, W, H)
ctx.save()
ctx.globalAlpha = quoteCard.layers.grainOpacity
drawCover(ctx, grain, W, H)
ctx.restore()
ctx.save()
ctx.globalAlpha = 0.62
ctx.fillStyle = quoteCard.layers.bgOverlayColor
ctx.fillRect(0, 0, W, H)
ctx.restore()

const vignette = ctx.createRadialGradient(W / 2, H / 2, 80, W / 2, H / 2, H * 0.72)
vignette.addColorStop(0, 'rgba(10, 20, 14, 0)')
vignette.addColorStop(1, 'rgba(10, 20, 14, 0.55)')
ctx.fillStyle = vignette
ctx.fillRect(0, 0, W, H)

const chip = 148
const chipX = (W - chip) / 2
const chipY = 72
ctx.save()
ctx.beginPath()
ctx.arc(chipX + chip / 2, chipY + chip / 2, chip / 2, 0, Math.PI * 2)
ctx.closePath()
ctx.clip()
ctx.drawImage(mark, chipX, chipY, chip, chip)
ctx.restore()
ctx.beginPath()
ctx.arc(chipX + chip / 2, chipY + chip / 2, chip / 2, 0, Math.PI * 2)
ctx.strokeStyle = 'rgba(168, 255, 200, 0.28)'
ctx.lineWidth = 2
ctx.stroke()

ctx.textAlign = 'center'
ctx.textBaseline = 'top'

ctx.fillStyle = '#e9fdf0'
ctx.font = '64px Iceberg'
ctx.fillText(brand.wordmark, W / 2, chipY + chip + 22)

ctx.fillStyle = 'rgba(233, 253, 240, 0.95)'
ctx.font = '36px Iceberg'
ctx.fillText(heroLine, W / 2, chipY + chip + 100)

ctx.fillStyle = 'rgba(198, 232, 210, 0.9)'
ctx.font = '24px Jost'
const subLines = wrapCentered(ctx, heroSub, W - 160)
let subY = chipY + chip + 156
for (const line of subLines) {
  ctx.fillText(line, W / 2, subY)
  subY += 32
}

ctx.fillStyle = 'rgba(122, 158, 134, 0.95)'
ctx.font = '22px Jost'
ctx.fillText(domain, W / 2, H - 52)

fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, canvas.toBuffer('image/png'))
console.log(`Wrote ${outPath} (${W}×${H})`)
