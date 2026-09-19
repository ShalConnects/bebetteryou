import { spawn } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { createCanvas, loadImage } from '@napi-rs/canvas'
import { quoteShort, quoteShortStyles } from '../../config/quote-card.js'
import { renderQuoteCard } from '../quote-card.mjs'

const CHUNK = 4
const BED_EXT = /\.(mp3|m4a|aac|wav)$/i
const videoOut = ['-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-movflags', '+faststart']

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

/** Fit src into dst by covering (center crop). */
export function coverRect(srcW, srcH, dstW, dstH) {
  const scale = Math.max(dstW / srcW, dstH / srcH)
  const w = Math.round(srcW * scale)
  const h = Math.round(srcH * scale)
  return { x: Math.round((dstW - w) / 2), y: Math.round((dstH - h) / 2), w, h }
}

/** Line / clause units — hook uses this; beats may split a leftover short line into words. */
function phraseUnits(text) {
  const raw = String(text ?? '').trim()
  if (!raw) return []
  const lines = raw.split(/\n/).map((s) => s.trim()).filter(Boolean)
  if (lines.length > 1) return lines
  const clauses = raw.split(/(?<=[,;:.—–!?])\s+/).map((s) => s.trim()).filter(Boolean)
  return clauses.length > 1 ? clauses : [raw.replace(/\s+/g, ' ')]
}

/** First line or clause — Shorts title / opening punch, never a one-word split. */
export function quoteHook(text) {
  return phraseUnits(text)[0] || ''
}

/** Line breaks, then clauses. A leftover short line stays one beat — not one word at a time. */
export function quotePhrases(text) {
  const units = phraseUnits(text)
  if (units.length !== 1) return units
  const words = (units[0] || '').split(/\s+/).filter(Boolean)
  if (words.length <= CHUNK) return units
  const out = []
  for (let i = 0; i < words.length; i += CHUNK) out.push(words.slice(i, i + CHUNK).join(' '))
  return out
}

/** First beat is a centered hook line; later beats accumulate. Last frame holds longer. */
export function shortBeats(text, card = quoteShort) {
  const phrases = quotePhrases(text)
  const { beat, hold, hook, maxSeconds } = card
  const times = phrases.map((_, i) => (i === phrases.length - 1 ? beat + hold : beat) + (i === 0 ? hook : 0))
  const total = times.reduce((sum, t) => sum + t, 0)
  const scale = total > maxSeconds ? maxSeconds / total : 1
  const full = phrases.join('\n')
  return phrases.map((phrase, i) => ({
    text: i === 0 ? phrase : full,
    reveal: i === 0 ? undefined : i + 1,
    seconds: Math.round(times[i] * scale * 100) / 100,
  }))
}

/** 9:16 JPEG of the quote card covering the Short canvas (no-text fallback). */
export async function renderShortFrame(imageBuffer, card = quoteShort) {
  if (!imageBuffer?.length) throw new Error('Image file missing')
  const img = await loadImage(imageBuffer)
  const { width, height, bg } = card
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, width, height)
  const r = coverRect(img.width, img.height, width, height)
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

function clipFade(prev, next, desired) {
  const cap = Math.min(prev, next) / 3
  return prev > 0 && next > 0 && desired > 0 ? Math.min(desired, cap) : 0
}

/** fadeblack on hook→stack and quote→end; dissolve while lines accumulate. */
export function shortTransitions(seconds, quoteCount, card = quoteShort) {
  if (!seconds || seconds.length < 2) return []
  const n = seconds.length
  const out = []
  for (let i = 1; i < n; i++) {
    const layout = (i === 1 && quoteCount > 1) || (i === quoteCount && quoteCount < n)
    const d = clipFade(seconds[i - 1], seconds[i], layout ? card.crossfade : card.lineFade)
    out.push({ type: layout ? 'fadeblack' : 'fade', d })
  }
  return out
}

function stillInputs(files, seconds, fps) {
  return files.flatMap((file, i) => ['-loop', '1', '-framerate', String(fps), '-t', String(seconds[i]), '-i', file])
}

function xfadeGraph(seconds, transitions, card = quoteShort) {
  const { width, height, fps } = card
  const prep = (i, out) => `[${i}:v]scale=${width}:${height},setsar=1,fps=${fps},format=yuv420p[${out}]`
  if (seconds.length < 2) return prep(0, 'v')
  const parts = seconds.map((_, i) => prep(i, `s${i}`))
  let prev = 's0'
  let t = seconds[0]
  for (let i = 1; i < seconds.length; i++) {
    const { type, d } = transitions[i - 1]
    const out = i === seconds.length - 1 ? 'v' : `x${i}`
    if (d > 0) {
      parts.push(`[${prev}][s${i}]xfade=transition=${type}:duration=${d}:offset=${+(t - d).toFixed(3)}[${out}]`)
      t += seconds[i] - d
    } else {
      parts.push(`[${prev}][s${i}]concat=n=2:v=1:a=0[${out}]`)
      t += seconds[i]
    }
    prev = out
  }
  return parts.join(';')
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

function tagSeed(tags, salt = '', fallback = '') {
  const key =
    [...new Set((tags || []).map((t) => String(t).trim()).filter(Boolean))].sort().join('|') ||
    String(fallback ?? '').trim()
  if (!key) return null
  const body = salt ? `${salt}|${key}` : key
  let h = 2166136261
  for (let i = 0; i < body.length; i++) h = Math.imul(h ^ body.charCodeAt(i), 16777619)
  return h >>> 0
}

function pickIndex(length, random, tags, salt = '', fallback = '') {
  if (!length) return -1
  const seed = tagSeed(tags, salt, fallback)
  return seed == null ? Math.floor(random() * length) : seed % length
}

/** Stable bed from quote tags (or slug fallback). Pass `random` when neither is set. */
export function pickShortBed(random = Math.random, tags, seed = '') {
  const beds = listShortBeds()
  if (!beds.length) return ''
  return beds[pickIndex(beds.length, random, tags, 'bed', seed)]
}

/** Merge a style preset onto the base Short layout. */
export function resolveShortStyle(style = {}) {
  const { id = 'classic', quote, layers, ...rest } = style
  return {
    ...quoteShort,
    ...rest,
    id,
    quote: quote ? { ...quoteShort.quote, ...quote } : quoteShort.quote,
    layers: layers ? { ...quoteShort.layers, ...layers } : quoteShort.layers,
  }
}

/** Punch type shrinks toward classic when the quote is long (avoids overflow). */
export function fitShortStyle(card, text) {
  if (card?.id !== 'punch') return card
  const raw = String(text ?? '')
  const long = raw.length > 90 || quotePhrases(raw).length > 3
  if (!long) return card
  return {
    ...card,
    padX: quoteShort.padX,
    quote: {
      ...quoteShort.quote,
      size: Math.round(quoteShort.quote.size * 1.06),
      firstCharSize: Math.round(quoteShort.quote.firstCharSize * 1.08),
      lineHeight: 1.34,
    },
  }
}

/** Stable Short style from tags (or slug). Salt differs from beds. */
export function pickShortStyle(random = Math.random, tags, seed = '') {
  const list = quoteShortStyles
  const i = pickIndex(list.length, random, tags, 'style', seed)
  return resolveShortStyle(list[i < 0 ? 0 : i])
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

/** Encode a 9:16 H.264 Short: phrase stills + bed, or cover-fit JPEG if no text. */
export async function encodeQuoteShort(imageBuffer, quote, { music, style } = {}) {
  const ffmpeg = (await import('ffmpeg-static')).default
  if (!ffmpeg) throw new Error('ffmpeg missing — cannot encode YouTube Short')

  const seed = quote?.slug || (quote?.n != null ? `bby-${quote.n}` : '')
  const card = fitShortStyle(style || pickShortStyle(Math.random, quote?.tags, seed), quote?.text)
  const quoteBeats = hasQuoteText(quote)
    ? await Promise.all(
        shortBeats(quote.text, card).map(async (beat) => ({
          seconds: beat.seconds,
          jpg: await renderQuoteCard({
            n: quote.n,
            text: beat.text,
            author: quote.author || '',
            card,
            reveal: beat.reveal,
          }),
        }))
      )
    : [{ seconds: card.fallbackSeconds, jpg: await renderShortFrame(imageBuffer, card) }]
  const poster = quoteBeats[quoteBeats.length - 1].jpg
  const beats =
    hasQuoteText(quote) && card.end
      ? [
          ...quoteBeats,
          {
            seconds: card.end,
            jpg: await renderQuoteCard({
              n: quote.n,
              text: card.endText,
              author: '',
              card,
            }),
          },
        ]
      : quoteBeats

  const seconds = beats.map((b) => b.seconds)
  const transitions = shortTransitions(seconds, quoteBeats.length, card)
  const duration = seconds.reduce((sum, t) => sum + t, 0) - transitions.reduce((sum, x) => sum + x.d, 0)
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
    const audioFade = Math.max(0, duration - 1)
    await run(ffmpeg, [
      '-y',
      ...stillInputs(files, seconds, card.fps),
      ...musicInput(duration, music ?? pickShortBed(Math.random, quote?.tags, seed)),
      '-t',
      String(duration),
      '-filter_complex',
      xfadeGraph(seconds, transitions, card),
      '-map',
      '[v]',
      '-map',
      `${files.length}:a`,
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
      `afade=t=in:d=0.3,afade=t=out:st=${audioFade}:d=1,volume=0.75`,
      mp4,
    ])
    return { video: await fs.promises.readFile(mp4), poster, style: card.id }
  } finally {
    await fs.promises.rm(dir, { recursive: true, force: true })
  }
}
