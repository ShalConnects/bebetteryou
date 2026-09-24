import { createCanvas, loadImage } from '@napi-rs/canvas'
import { quoteCard } from '../config/quote-card.js'

const GAP = 16
const PAD = 24
const BG = quoteCard.bg

/** Prefer readable cells: 1 → full card; 2–4 → 2-col; 5–6 → 2×3; 7+ → 3-col. */
function layout(count) {
  if (count <= 1) return { cols: 1, cellW: quoteCard.width, cellH: quoteCard.height }
  if (count <= 4) return { cols: 2, cellW: 520, cellH: 650 }
  if (count <= 6) return { cols: 2, cellW: 520, cellH: 650 }
  return { cols: 3, cellW: 400, cellH: 500 }
}

/** Grid collage of quote-card JPEGs. Returns `{ buffer, width, height }`. */
export async function renderWeekCollage(imageBuffers) {
  const buffers = (imageBuffers || []).filter((b) => b?.length)
  if (!buffers.length) throw new Error('No quote images for collage')

  const { cols, cellW, cellH } = layout(buffers.length)
  const rows = Math.ceil(buffers.length / cols)
  const width = PAD * 2 + cols * cellW + (cols - 1) * GAP
  const height = PAD * 2 + rows * cellH + (rows - 1) * GAP

  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = BG
  ctx.fillRect(0, 0, width, height)

  const images = await Promise.all(buffers.map((b) => loadImage(b)))
  images.forEach((img, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const x = PAD + col * (cellW + GAP)
    const y = PAD + row * (cellH + GAP)
    ctx.drawImage(img, x, y, cellW, cellH)
  })

  let quality = 88
  let buffer = canvas.toBuffer('image/jpeg', quality)
  while (buffer.length > 950_000 && quality > 55) {
    quality -= 8
    buffer = canvas.toBuffer('image/jpeg', quality)
  }

  return { buffer, width, height }
}
