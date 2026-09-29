import { motifByTag, motifFallback, motifPriority } from '../config/quote-motifs.js'

/** Pick a motif id from quote tags (catalog order), else a stable fallback from `n`. */
export function pickMotif(tags = [], n = 0) {
  const set = new Set((Array.isArray(tags) ? tags : []).map(String))
  for (const tag of motifPriority) {
    if (set.has(tag) && motifByTag[tag]) return motifByTag[tag]
  }
  const i = Math.abs(Number(n) || 0) % motifFallback.length
  return motifFallback[i]
}

/**
 * Draw a simple geometric motif centered at (cx, cy).
 * Callers set strokeStyle / globalAlpha / lineWidth before invoking.
 */
export function drawMotif(ctx, id, cx, cy, size) {
  ctx.save()
  ctx.translate(cx, cy)
  const s = size / 2
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  switch (id) {
    case 'spark':
      drawSpark(ctx, s)
      break
    case 'lens':
      drawLens(ctx, s)
      break
    case 'sprout':
      drawSprout(ctx, s)
      break
    case 'heart':
      drawHeart(ctx, s)
      break
    case 'figure':
      drawFigure(ctx, s)
      break
    default:
      drawSpark(ctx, s)
  }

  ctx.restore()
}

/** Rising spark / push — Motivation */
function drawSpark(ctx, s) {
  ctx.beginPath()
  ctx.moveTo(0, s * 0.75)
  ctx.lineTo(0, -s * 0.55)
  ctx.moveTo(-s * 0.32, -s * 0.15)
  ctx.lineTo(0, -s * 0.55)
  ctx.lineTo(s * 0.32, -s * 0.15)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(-s * 0.45, s * 0.1)
  ctx.lineTo(-s * 0.18, -s * 0.05)
  ctx.moveTo(s * 0.45, s * 0.1)
  ctx.lineTo(s * 0.18, -s * 0.05)
  ctx.stroke()
}

/** Clear lens / focus — Mindset */
function drawLens(ctx, s) {
  ctx.beginPath()
  ctx.arc(0, 0, s * 0.55, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(0, 0, s * 0.28, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(-s * 0.85, 0)
  ctx.lineTo(-s * 0.55, 0)
  ctx.moveTo(s * 0.55, 0)
  ctx.lineTo(s * 0.85, 0)
  ctx.stroke()
}

/** Angular sprout — Growth */
function drawSprout(ctx, s) {
  ctx.beginPath()
  ctx.moveTo(0, s * 0.7)
  ctx.lineTo(0, -s * 0.1)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(0, s * 0.05)
  ctx.lineTo(-s * 0.45, -s * 0.35)
  ctx.lineTo(-s * 0.1, -s * 0.2)
  ctx.closePath()
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(0, -s * 0.05)
  ctx.lineTo(s * 0.5, -s * 0.55)
  ctx.lineTo(s * 0.15, -s * 0.25)
  ctx.closePath()
  ctx.stroke()
}

/** Faceted heart — Love */
function drawHeart(ctx, s) {
  ctx.beginPath()
  ctx.moveTo(0, s * 0.55)
  ctx.lineTo(-s * 0.55, s * 0.05)
  ctx.lineTo(-s * 0.55, -s * 0.25)
  ctx.lineTo(-s * 0.25, -s * 0.5)
  ctx.lineTo(0, -s * 0.28)
  ctx.lineTo(s * 0.25, -s * 0.5)
  ctx.lineTo(s * 0.55, -s * 0.25)
  ctx.lineTo(s * 0.55, s * 0.05)
  ctx.closePath()
  ctx.stroke()
}

/** Person mark — Yourself */
function drawFigure(ctx, s) {
  ctx.beginPath()
  ctx.arc(0, -s * 0.4, s * 0.22, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(-s * 0.4, s * 0.55)
  ctx.lineTo(-s * 0.22, s * 0.05)
  ctx.lineTo(s * 0.22, s * 0.05)
  ctx.lineTo(s * 0.4, s * 0.55)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(-s * 0.22, s * 0.05)
  ctx.lineTo(0, -s * 0.12)
  ctx.lineTo(s * 0.22, s * 0.05)
  ctx.stroke()
}
