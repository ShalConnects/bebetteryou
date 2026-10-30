/** Tag lane helpers — pure, isomorphic (no I/O). Catalog tags route quote ↔ scripture ↔ blog ↔ social. */
import { themeLabel, themeLanes } from '@/config/themes'

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

/** Every theme a card or passage may use: the tag lanes plus the finer themes under them. */
export function knownThemes(tags) {
  return new Set([...themeSet(tags), ...Object.values(themeLanes).flat()])
}

/** Picker rows grouped by tag: its lane theme first, then the finer themes under it. */
export function themeOptions(tags) {
  return (tags || [])
    .filter((t) => t?.name && t?.theme)
    .flatMap((t) =>
      [t.theme, ...(themeLanes[t.theme] || [])].map((theme) => ({ tag: t.name, theme, label: `${t.name} · ${themeLabel(theme)}` }))
    )
}

/** Validate theme against catalog lanes and their finer themes; empty if unknown. */
export function resolveKnownTheme(theme, tagsOrSet) {
  const resolved = normalizeTheme(theme)
  if (!resolved) return ''
  const known = tagsOrSet instanceof Set ? tagsOrSet : knownThemes(tagsOrSet)
  return known.has(resolved) ? resolved : ''
}

/** Theme → owning tag name, finer themes included (they belong to their lane's tag). */
export function tagForThemeMap(tags) {
  return Object.fromEntries(themeOptions(tags).map(({ tag, theme }) => [theme, tag]))
}

/** Rename or drop one catalog name (`to` empty → remove). */
export function retargetName(from, to) {
  return (name) => (name === from ? to : name)
}

export function retargetNames(from, to) {
  const one = retargetName(from, to)
  return (names) => [...new Set((names || []).map(one).filter(Boolean))]
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
