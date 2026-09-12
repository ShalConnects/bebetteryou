import { spawn } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { createCanvas, loadImage } from '@napi-rs/canvas'
import { quoteShort } from '@/config/quote-card'

/** Fit src into dst with letterbox bars (no crop). */
export function letterboxRect(srcW, srcH, dstW, dstH) {
  const scale = Math.min(dstW / srcW, dstH / srcH)
  const w = Math.round(srcW * scale)
  const h = Math.round(srcH * scale)
  return { x: Math.round((dstW - w) / 2), y: Math.round((dstH - h) / 2), w, h }
}

/** 9:16 JPEG of the quote card on the Short canvas. */
export async function renderShortFrame(imageBuffer) {
  if (!imageBuffer?.length) throw new Error('Image file missing')
  const img = await loadImage(imageBuffer)
  const { width, height, bg } = quoteShort
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, width, height)
  const r = letterboxRect(img.width, img.height, width, height)
  ctx.drawImage(img, r.x, r.y, r.w, r.h)
  return canvas.toBuffer('image/jpeg', 92)
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let err = ''
    child.stderr.on('data', (chunk) => {
      err += chunk
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(err.trim().split('\n').pop() || 'ffmpeg failed'))
    })
  })
}

/** Encode an 8s H.264 Short from the quote JPEG (still image, no audio). */
export async function encodeQuoteShort(imageBuffer) {
  const ffmpeg = (await import('ffmpeg-static')).default
  if (!ffmpeg) throw new Error('ffmpeg missing — cannot encode YouTube Short')
  const frame = await renderShortFrame(imageBuffer)
  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'bby-short-'))
  const jpg = path.join(dir, 'frame.jpg')
  const mp4 = path.join(dir, 'short.mp4')
  try {
    await fs.promises.writeFile(jpg, frame)
    await run(ffmpeg, [
      '-y',
      '-loop',
      '1',
      '-i',
      jpg,
      '-t',
      String(quoteShort.seconds),
      '-vf',
      `fps=${quoteShort.fps},format=yuv420p`,
      '-c:v',
      'libx264',
      '-tune',
      'stillimage',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      '-an',
      mp4,
    ])
    return fs.promises.readFile(mp4)
  } finally {
    await fs.promises.rm(dir, { recursive: true, force: true })
  }
}
