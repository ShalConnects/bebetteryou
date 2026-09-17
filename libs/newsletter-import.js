export const NEWSLETTER_IMPORT_MAX = 5000

/** Split one CSV line; supports quoted fields and "" escapes. */
export function splitCsvLine(line) {
  const out = []
  let cur = ''
  let inQuotes = false
  const s = String(line ?? '')
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (ch === '"') {
      if (inQuotes && s[i + 1] === '"') {
        cur += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out
}

function parseBoolCell(value, fallback = true) {
  if (value == null || String(value).trim() === '') return fallback
  const s = String(value).trim().toLowerCase()
  if (['false', '0', 'no', 'n', 'off'].includes(s)) return false
  if (['true', '1', 'yes', 'y', 'on'].includes(s)) return true
  return fallback
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Parse newsletter CSV or one-email-per-line text.
 * Header optional: email[,quotes][,blog][,books]
 */
export function parseNewsletterImportCsv(text) {
  const lines = String(text || '')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  if (!lines.length) return { rows: [], invalid: [] }

  const headerCells = splitCsvLine(lines[0]).map((c) => c.trim().toLowerCase())
  const hasHeader = headerCells.includes('email')
  let emailIdx = 0
  let quotesIdx = -1
  let blogIdx = -1
  let booksIdx = -1
  let start = 0

  if (hasHeader) {
    emailIdx = Math.max(0, headerCells.indexOf('email'))
    quotesIdx = headerCells.indexOf('quotes')
    blogIdx = headerCells.indexOf('blog')
    booksIdx = headerCells.indexOf('books')
    start = 1
  }

  const rows = []
  const invalid = []
  const seen = new Set()

  for (let i = start; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i])
    const raw = String(cols[emailIdx] ?? '')
      .trim()
      .toLowerCase()
      .replace(/^<|>$/g, '')
    if (!raw) continue
    if (!EMAIL_RE.test(raw) || raw.length > 255) {
      invalid.push(raw)
      continue
    }
    if (seen.has(raw)) continue
    seen.add(raw)

    rows.push({
      email: raw,
      prefs: {
        quotes: quotesIdx >= 0 ? parseBoolCell(cols[quotesIdx], true) : true,
        blog: blogIdx >= 0 ? parseBoolCell(cols[blogIdx], true) : true,
        books: booksIdx >= 0 ? parseBoolCell(cols[booksIdx], true) : true,
      },
    })
  }

  return { rows, invalid }
}
