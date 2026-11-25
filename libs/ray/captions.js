import { ray } from '@/config/ray'

/** Speech spans `[start, end]` from ffmpeg `silencedetect` stderr. */
export function speechSpans(log, duration) {
  const starts = [...log.matchAll(/silence_start: ([\d.]+)/g)].map((m) => +m[1])
  const ends = [...log.matchAll(/silence_end: ([\d.]+)/g)].map((m) => +m[1])
  const spans = []
  let t = 0
  starts.forEach((s, i) => {
    if (s - t > 0.05) spans.push([t, s])
    t = ends[i] ?? duration
  })
  if (duration - t > 0.05) spans.push([t, duration])
  return spans
}

const weight = (w) => w.replace(/\W/g, '').length + 2

/** Words over a clock span, by length. */
function spread(words, start, end) {
  const total = words.reduce((s, w) => s + weight(w), 0)
  let t = start
  return words.map((w) => {
    const d = (weight(w) / total) * (end - start)
    t += d
    return [w, t - d, t]
  })
}

/**
 * `[word, start, end]` for a known script. One pause per sentence pins each sentence to
 * its own span; otherwise words share all the speech, by length.
 */
export function timeWords(script, spans) {
  const sentences = script.match(/[^.!?]+[.!?]*/g)?.map((s) => s.trim().split(/\s+/)) || []
  if (!spans.length) return []
  if (sentences.length === spans.length) return sentences.flatMap((ws, i) => spread(ws, ...spans[i]))
  const speech = spans.reduce((s, [a, b]) => s + b - a, 0)
  const clock = (x) => {
    for (const [a, b] of spans) {
      if (x <= b - a) return a + x
      x -= b - a
    }
    return spans.at(-1)[1]
  }
  return spread(sentences.flat(), 0, speech).map(([w, a, b]) => [w, clock(a + 1e-3), clock(b)])
}

/** Up to 3 words a line, at most 15 characters, breaking after punctuation. */
export function chunkWords(timed) {
  const chunks = []
  let cur = []
  timed.forEach((item, i) => {
    cur.push(item)
    const next = timed[i + 1]?.[0] || ''
    const text = cur.map(([w]) => w).join(' ')
    if (cur.length === 3 || /[.,!?]$/.test(item[0]) || !next || `${text} ${next}`.length > 15) {
      chunks.push(cur)
      cur = []
    }
  })
  return chunks
}

const ts = (x) => `0:${String(Math.floor(x / 60)).padStart(2, '0')}:${(x % 60).toFixed(2).padStart(5, '0')}`

/** Full ASS file: hook (first seconds), site mark, and word-by-word captions with the spoken word lit. */
export function buildAss({ width: W, height: H, duration, hook, timed }) {
  const { font, highlight, mark, hookSeconds } = ray.captions
  const size = Math.round(W * 0.105)
  const style = (name, px, outline, align, marginV, colour = '&H00FFFFFF') =>
    `Style: ${name},${font},${px},${colour},&H00FFFFFF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,${outline},${Math.max(2, Math.round(px / 20))},${align},${Math.round(W / 12)},${Math.round(W / 12)},${marginV},1`
  const line = (st, a, b, text) => `Dialogue: 0,${ts(a)},${ts(b)},${st},,0,0,0,,${text}`
  const events = [line('Mark', 0, duration, mark)]
  if (hook) {
    const rows = hook.toUpperCase().split(/\s+/).reduce((acc, w) => {
      if (acc.length && `${acc.at(-1)} ${w}`.length <= 14) acc[acc.length - 1] += ` ${w}`
      else acc.push(w)
      return acc
    }, [])
    events.push(line('Hook', 0, Math.min(hookSeconds, duration), rows.join('\\N')))
  }

  const chunks = chunkWords(timed)
  chunks.forEach((chunk, ci) => {
    const nextStart = chunks[ci + 1]?.[0][1]
    const last = chunk.at(-1)[2]
    const chunkEnd = nextStart != null && nextStart - last < 0.6 ? nextStart : Math.min(duration, last + 0.25)
    chunk.forEach(([, start], wi) => {
      const end = chunk[wi + 1]?.[1] ?? chunkEnd
      const text = chunk
        .map(([w], j) => (j === wi ? `{\\c${highlight}\\fscx112\\fscy112}${w.toUpperCase()}{\\r}` : w.toUpperCase()))
        .join(' ')
      events.push(line('Cap', start, end, text))
    })
  })

  return `[Script Info]
ScriptType: v4.00+
PlayResX: ${W}
PlayResY: ${H}
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
${style('Cap', size, Math.max(3, Math.round(size / 12)), 2, Math.round(H * 0.27))}
${style('Hook', Math.round(size * 0.85), Math.max(3, Math.round(size / 11)), 2, Math.round(H * 0.37), highlight.replace('&H', '&H00').slice(0, -1))}
${style('Mark', Math.round(size * 0.38), 2, 8, Math.round(H * 0.05))}

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${events.join('\n')}
`
}
