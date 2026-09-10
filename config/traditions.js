/** Tag → scripture theme (all catalog tags). */
export const tagThemes = {
  Motivation: 'perseverance',
  Mindset: 'clarity',
  Growth: 'growth',
  Love: 'love',
  Yourself: 'self-worth',
}

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

export const themeIds = new Set(Object.values(tagThemes))

export const translationOptions = {
  christianity: [
    { id: 'niv', label: 'NIV' },
    { id: 'kjv', label: 'KJV' },
  ],
}

export function translationsFor(tradition) {
  return translationOptions[tradition] || []
}
