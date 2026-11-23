import { spawn } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { pickShortBed } from '@/libs/social/quote-short'
import { buildAss, speechSpans, timeWords } from './captions'

/** Run ffmpeg; resolves with stderr (where it reports durations and silences). */
function ffmpeg(bin, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, ['-hide_banner', '-y', ...args], { stdio: ['ignore', 'ignore', 'pipe'] })
    let err = ''
    child.stderr.on('data', (c) => (err += c))
    child.on('error', reject)
    child.on('close', (code) => (code === 0 ? resolve(err) : reject(new Error(err.trim().split('\n').pop()))))
  })
}

/**
 * Finish a Higgsfield clip: hook + site mark + word-by-word captions, the quote's Short bed
 * under Ray's voice, and a poster frame. Returns `{ video, poster }` buffers.
 */
export async function renderRayVideo(raw, { quote, hook, script }) {
  const bin = (await import('ffmpeg-static')).default
  if (!bin) throw new Error('ffmpeg missing — cannot finish Ray video')
  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'bby-ray-'))
  const file = (name) => path.join(dir, name)
  try {
    await fs.promises.writeFile(file('raw.mp4'), raw)
    const log = await ffmpeg(bin, ['-i', file('raw.mp4'), '-af', 'silencedetect=noise=-32dB:d=0.18', '-f', 'null', '-'])
    const [, h, m, s] = log.match(/Duration: (\d+):(\d+):([\d.]+)/)
    const duration = +h * 3600 + +m * 60 + +s
    const [, width, height] = log.match(/Video:.*?(\d{3,4})x(\d{3,4})/)
    const timed = timeWords(script, speechSpans(log, duration))
    await fs.promises.writeFile(file('cap.ass'), buildAss({ width: +width, height: +height, duration, hook, timed }))

    const bed = pickShortBed(Math.random, quote?.tags, quote?.slug)
    const fonts = path.join(process.cwd(), 'assets/fonts')
    const fade = Math.max(0, duration - 1)
    await ffmpeg(bin, [
      '-i', file('raw.mp4'),
      ...(bed ? ['-stream_loop', '-1', '-i', bed] : []),
      '-filter_complex',
      [
        `[0:v]ass=${file('cap.ass')}:fontsdir=${fonts}[v]`,
        bed
          ? `[1:a]volume=0.15,afade=t=in:d=0.5,afade=t=out:st=${fade}:d=1[b];[0:a][b]amix=inputs=2:duration=first:normalize=0[a]`
          : '[0:a]anull[a]',
      ].join(';'),
      '-map', '[v]', '-map', '[a]',
      '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-movflags', '+faststart',
      file('out.mp4'),
    ])
    await ffmpeg(bin, ['-ss', '1', '-i', file('out.mp4'), '-frames:v', '1', '-q:v', '3', file('poster.jpg')])
    const [video, poster] = await Promise.all([fs.promises.readFile(file('out.mp4')), fs.promises.readFile(file('poster.jpg'))])
    return { video, poster }
  } finally {
    await fs.promises.rm(dir, { recursive: true, force: true })
  }
}
