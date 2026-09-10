/** Tag lane helpers — pure, isomorphic (no I/O). Catalog tags route quote ↔ scripture ↔ blog ↔ social. */

export function normalizeTheme(raw) {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

export function normalizeHashtags(raw) {
  return String(raw ?? '')
    .trim()
    .replace(/\s+/g, ' ')
}

/** Build a catalog row; omit empty optional fields. */
export function tagFields({ name, moodLabel = '', theme = '', hashtags = '' }) {
  const mood = String(moodLabel ?? '').trim()
  const th = normalizeTheme(theme)
  const hash = normalizeHashtags(hashtags)
  return {
    name,
    ...(mood ? { moodLabel: mood } : {}),
    ...(th ? { theme: th } : {}),
    ...(hash ? { hashtags: hash } : {}),
  }
}

export function themesMap(tags) {
  return Object.fromEntries((tags || []).filter((t) => t?.name && t?.theme).map((t) => [t.name, t.theme]))
}

export function themeSet(tags) {
  return new Set(Object.values(themesMap(tags)))
}

/** Validate theme against catalog lanes; empty if unknown. */
export function resolveKnownTheme(theme, tagsOrSet) {
  const resolved = normalizeTheme(theme)
  if (!resolved) return ''
  const known = tagsOrSet instanceof Set ? tagsOrSet : themeSet(tagsOrSet)
  return known.has(resolved) ? resolved : ''
}

export function tagForThemeMap(tags) {
  return Object.fromEntries(Object.entries(themesMap(tags)).map(([tag, theme]) => [theme, tag]))
}

/** Deduped hashtag string from quote tags + catalog lanes. */
export function hashtagsForTags(quoteTags, catalog) {
  const byName = Object.fromEntries((catalog || []).map((t) => [t.name, t]))
  const seen = new Set()
  for (const name of quoteTags || []) {
    for (const part of String(byName[name]?.hashtags || '').split(/\s+/)) {
      if (part) seen.add(part)
    }
  }
  return [...seen].join(' ')
}
