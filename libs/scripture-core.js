import { tagThemes, traditionIds, translationsFor } from '@/config/traditions'

export function themesForTags(tags, map) {
  const lookup = map || tagThemes
  const out = []
  for (const tag of tags || []) {
    const theme = lookup[tag]
    if (theme) out.push(theme)
  }
  return out
}

/** Stored quote.theme first (validated at write), then the tags' lane themes as fallbacks. */
export function themesForQuote(tags, theme, map) {
  const lanes = themesForTags(tags, map)
  return theme ? [theme, ...lanes.filter((t) => t !== theme)] : lanes
}

export function quoteShowsScripture(tags, theme, map) {
  return themesForQuote(tags, theme, map).length > 0
}

export function themeEntries(raw) {
  if (!raw) return []
  return Array.isArray(raw) ? raw : [raw]
}

export function seedFromKey(key) {
  let h = 0
  const s = String(key ?? '')
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function resolveTranslation(entry, translationId) {
  if (!entry) return null
  const alt = translationId && entry.alt?.[translationId]
  const { original = null, lang = null } = entry
  if (alt?.text) {
    const translation = translationId.toUpperCase()
    return { ref: alt.ref || entry.ref, text: alt.text, url: alt.url ?? entry.url ?? null, translation, original, lang }
  }
  return { ref: entry.ref, text: entry.text, url: entry.url ?? null, translation: entry.translation || null, original, lang }
}

/** Every passage for the first of the quote's themes that has any in this tradition. */
export function scriptureChoices(book, tradition, tags, theme, map) {
  if (!book?.[tradition] || tradition === 'none' || !traditionIds.has(tradition)) return []
  for (const t of themesForQuote(tags, theme, map || tagThemes)) {
    const entries = themeEntries(book[tradition][t])
    if (entries.length) return entries
  }
  return []
}

/**
 * Pick a passage for tradition + tags/theme. The quote's seed keeps the pick stable;
 * `offset` steps through the alternatives ("Another passage"). `choices` = how many there are.
 */
export function scriptureFor(book, tradition, tags, seedKey, translationId, theme, map, offset = 0) {
  const entries = scriptureChoices(book, tradition, tags, theme, map)
  if (!entries.length) return null
  const useTranslation = translationsFor(tradition).some((t) => t.id === translationId) ? translationId : null
  const entry = entries[(seedFromKey(seedKey) + offset) % entries.length]
  return { ...resolveTranslation(entry, useTranslation), choices: entries.length }
}

export function scriptureShareText(base, entry) {
  if (!entry?.text) return base || ''
  const line = `${entry.text} — ${entry.ref}`
  return base ? `${base}\n\n${line}` : line
}
