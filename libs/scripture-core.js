import { tagThemes, traditionIds, translationsFor } from '@/config/traditions'

export function themesForTags(tags) {
  const out = []
  for (const tag of tags || []) {
    const theme = tagThemes[tag]
    if (theme) out.push(theme)
  }
  return out
}

export function quoteShowsScripture(tags) {
  return themesForTags(tags).length > 0
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

/** Pick passage for tradition + tags; rotates by seedKey (quote slug/n). */
export function scriptureFor(book, tradition, tags, seedKey, translationId) {
  if (!book || !tradition || tradition === 'none' || !traditionIds.has(tradition)) return null
  const themes = book[tradition]
  if (!themes) return null
  const useTranslation = translationsFor(tradition).some((t) => t.id === translationId) ? translationId : null
  for (const theme of themesForTags(tags)) {
    const entries = themeEntries(themes[theme])
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
