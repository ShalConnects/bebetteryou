import { quoteCard } from '@/config/quote-card'
import { brand } from '@/config/site'

const { maxChars, maxLines } = quoteCard.quote

/** Card text is multi-line; alt/share/meta all need it on one line. */
export function quoteOneLine(text) {
  return String(text ?? '').replace(/\n/g, ' ').trim()
}

/** The quote is baked into the JPEG, so the alt has to carry it. */
export function quoteAlt(quote) {
  const text = quoteOneLine(quote.text)
  if (!text) return `Quote card #${quote.n}`
  const credit = quote.author?.trim()
  return credit ? `${text} — ${credit}` : text
}

/**
 * Most of the catalogue is scanned artwork with the words baked into the JPEG
 * and no `text` field. Those cannot be printed — there is nothing to typeset —
 * so every entry point to the print flow has to ask this first, or the renderer
 * would stringify the missing value and set the word "Undefined" on a garment.
 */
export function isPrintableQuote(quote) {
  return Boolean(quoteOneLine(quote?.text))
}

/** Share copy — falls back to the brand when a quote has no stored text. */
export function quoteLabel(quote) {
  return quoteOneLine(quote.text) || `Quote #${quote.n} — ${brand.name}`
}

export function quoteMetrics(text) {
  const value = String(text ?? '')
  return { chars: value.length, hardLines: value ? value.split('\n').length : 0 }
}

/** Clamp while typing / pasting (chars + hard Enter spam). */
export function clampQuoteInput(raw) {
  let text = String(raw ?? '')
  if (text.length > maxChars) text = text.slice(0, maxChars)
  const parts = text.split('\n')
  if (parts.length > maxLines) text = parts.slice(0, maxLines).join('\n')
  return text
}

/** Char limits only — visual wrap checked via assertQuoteFits (server). */
export function normalizeQuoteText(raw) {
  const text = String(raw ?? '').trim()
  if (!text) throw new Error('text required')
  if (text.length > maxChars) throw new Error(`Quote must be ${maxChars} characters or fewer`)
  return text
}

/** Empty allowed — omit attribution on the card. */
export function normalizeAuthor(raw) {
  return String(raw ?? '').trim()
}

export function quoteLinesOverflowMessage(lines) {
  return `Fits ${maxLines} lines on the card — shorten the text (${lines}/${maxLines}).`
}
