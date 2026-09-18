import { spawn } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { createCanvas, loadImage } from '@napi-rs/canvas'
import { quoteShort } from '../../config/quote-card.js'
import { renderQuoteCard } from '../quote-card.mjs'

const CHUNK = 4
const BED_EXT = /\.(mp3|m4a|aac|wav)$/i
const videoOut = [
  '-c:v',
  'libx264',
  '-preset',
  'veryfast',
  '-tune',
  'stillimage',
  '-pix_fmt',
  'yuv420p',
  '-movflags',
  '+faststart',
]

function hasQuoteText(quote) {
  return Boolean(String(quote?.text ?? '').replace(/\n/g, ' ').trim())
}

/** Fit src into dst with letterbox bars (no crop). */
export function letterboxRect(srcW, srcH, dstW, dstH) {
  const scale = Math.min(dstW / srcW, dstH / srcH)
  const w = Math.round(srcW * scale)
  const h = Math.round(srcH * scale)
  return { x: Math.round((dstW - w) / 2), y: Math.round((dstH - h) / 2), w, h }
}

/** Line breaks, then clauses, then word groups. One-word beats when the line is short. */
export function quotePhrases(text) {
  const raw = String(text ?? '').trim()
  if (!raw) return []
  const lines = raw.split(/\n/).map((s) => s.trim()).filter(Boolean)
  if (lines.length > 1) return lines
  const clauses = raw.split(/(?<=[,;:.—–!?])\s+/).map((s) => s.trim()).filter(Boolean)
  if (clauses.length > 1) return clauses
  const words = raw.split(/\s+/).filter(Boolean)
  const n = words.length <= CHUNK ? 1 : CHUNK
  const out = []
  for (let i = 0; i < words.length; i += n) out.push(words.slice(i, i + n).join(' '))
  return out
}

/** Accumulating on-screen beats. Last frame holds longer. Total capped at maxSeconds. */
export function shortBeats(text) {
  const phrases = quotePhrases(text)
  const { beat, hold, maxSeconds } = quoteShort
  const times = phrases.map((_, i) => (i === phrases.length - 1 ? beat + hold : beat))
  const total = times.reduce((sum, t) => sum + t, 0)
  const scale = total > maxSeconds ? maxSeconds / total : 1
  const full = phrases.join('\n')
  return phrases.map((_, i) => ({
    text: full,
    reveal: i + 1,
    seconds: Math.round(times[i] * scale * 100) / 100,
  }))
}

/** 9:16 JPEG of the quote card on the Short canvas (no-text fallback). */
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

function concatScript(files, seconds) {
  const esc = (file) => file.replace(/'/g, "'\\''")
  const lines = files.flatMap((file, i) => [`file '${esc(file)}'`, `duration ${seconds[i]}`])
  lines.push(`file '${esc(files[files.length - 1])}'`)
  return lines.join('\n')
}

/** Audio files in quoteShort.musicDir, sorted so picks are stable. */
export function listShortBeds() {
  const dir = path.join(process.cwd(), quoteShort.musicDir)
  try {
    return fs
      .readdirSync(dir)
      .filter((name) => BED_EXT.test(name))
      .sort()
      .map((name) => path.join(dir, name))
  } catch {
    return []
  }
}

/** One bed per post. Pass `random` in tests. */
export function pickShortBed(random = Math.random) {
  const beds = listShortBeds()
  return beds.length ? beds[Math.floor(random() * beds.length)] : ''
}

function musicInput(seconds, file = pickShortBed()) {
  if (file && fs.existsSync(file)) return ['-stream_loop', '-1', '-i', file]
  return [
    '-f',
    'lavfi',
    '-t',
    String(seconds),
    '-i',
    `aevalsrc=exprs='0.08*sin(2*PI*174.61*t)+0.055*sin(2*PI*220*t)+0.04*sin(2*PI*261.63*t)':s=44100:d=${seconds}`,
  ]
}

/** Encode a 9:16 H.264 Short: phrase stills + bed, or letterboxed JPEG if no text. */
export async function encodeQuoteShort(imageBuffer, quote, { music } = {}) {
  const ffmpeg = (await import('ffmpeg-static')).default
  if (!ffmpeg) throw new Error('ffmpeg missing — cannot encode YouTube Short')

  const beats = hasQuoteText(quote)
    ? await Promise.all(
        shortBeats(quote.text).map(async (beat) => ({
          seconds: beat.seconds,
          jpg: await renderQuoteCard({
            n: quote.n,
            text: beat.text,
            author: quote.author || '',
            card: quoteShort,
            reveal: beat.reveal,
          }),
        }))
      )
    : [{ seconds: quoteShort.fallbackSeconds, jpg: await renderShortFrame(imageBuffer) }]

  const duration = beats.reduce((sum, b) => sum + b.seconds, 0)
  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'bby-short-'))
  const mp4 = path.join(dir, 'short.mp4')
  try {
    const files = await Promise.all(
      beats.map(async (b, i) => {
        const file = path.join(dir, `${i}.jpg`)
        await fs.promises.writeFile(file, b.jpg)
        return file
      })
    )
    const list = path.join(dir, 'concat.txt')
    await fs.promises.writeFile(list, concatScript(files, beats.map((b) => b.seconds)))
    const fade = Math.max(0, duration - 1)
    await run(ffmpeg, [
      '-y',
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      list,
      ...musicInput(duration, music),
      '-t',
      String(duration),
      '-vf',
      `fps=${quoteShort.fps},format=yuv420p`,
      ...videoOut,
      '-c:a',
      'aac',
      '-ac',
      '2',
      '-ar',
      '44100',
      '-b:a',
      '96k',
      '-af',
      `afade=t=in:d=0.3,afade=t=out:st=${fade}:d=1,volume=0.55`,
      mp4,
    ])
    return fs.promises.readFile(mp4)
  } finally {
    await fs.promises.rm(dir, { recursive: true, force: true })
  }
}
