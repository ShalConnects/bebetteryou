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

/** Stored quote.theme wins (validated at write); else map from tags. */
export function themesForQuote(tags, theme, map) {
  return theme ? [theme] : themesForTags(tags, map)
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
  if (alt?.text) {
    return { ref: alt.ref || entry.ref, text: alt.text, url: alt.url ?? entry.url ?? null }
  }
  return { ref: entry.ref, text: entry.text, url: entry.url ?? null }
}

/** Pick passage for tradition + tags/theme; rotates by seedKey (quote slug/n). */
export function scriptureFor(book, tradition, tags, seedKey, translationId, theme, map) {
  if (!book || !tradition || tradition === 'none' || !traditionIds.has(tradition)) return null
  const themes = book[tradition]
  if (!themes) return null
  const useTranslation = translationsFor(tradition).some((t) => t.id === translationId) ? translationId : null
  for (const t of themesForQuote(tags, theme, map || tagThemes)) {
    const entries = themeEntries(themes[t])
    if (entries.length) {
      return resolveTranslation(entries[seedFromKey(seedKey) % entries.length], useTranslation)
    }
  }
  return null
}

export function scriptureShareText(base, entry) {
  if (!entry?.text) return base || ''
  const line = `${entry.text} — ${entry.ref}`
  return base ? `${base}\n\n${line}` : line
}
