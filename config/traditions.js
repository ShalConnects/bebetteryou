import { tagSeed } from '@/config/quotes'
import { themesMap, themeSet, normalizeTheme } from '@/libs/tag-lane'

export { normalizeTheme }

/** Seed-derived tag → scripture theme (runtime catalog may add lanes). */
export const tagThemes = themesMap(tagSeed)
export const themeIds = themeSet(tagSeed)

export const traditions = [
  { id: 'christianity', label: 'Christianity' },
  { id: 'islam', label: 'Islam' },
  { id: 'judaism', label: 'Judaism' },
  { id: 'hinduism', label: 'Hinduism' },
  { id: 'buddhism', label: 'Buddhism' },
  { id: 'sikhism', label: 'Sikhism' },
  { id: 'secular', label: 'Atheist / secular' },
  { id: 'spiritual', label: 'Spiritual, not religious' },
  { id: 'none', label: 'Prefer not to say' },
]

export const traditionIds = new Set(traditions.map((t) => t.id))

export const translationOptions = {
  christianity: [
    { id: 'niv', label: 'NIV' },
    { id: 'kjv', label: 'KJV' },
  ],
}

export function translationsFor(tradition) {
  return translationOptions[tradition] || []
}
