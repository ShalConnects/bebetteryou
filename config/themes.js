/**
 * Finer scripture themes, registered under each mood tag's own theme (its lane).
 * A card can pin one; the tag's lane theme stays the fallback.
 */
export const themeLanes = {
  perseverance: ['courage', 'hope'],
  clarity: ['peace', 'patience'],
  growth: ['discipline', 'gratitude'],
  love: ['forgiveness', 'letting-go'],
  'self-worth': ['rest', 'purpose'],
}

export const themeLabel = (id) => String(id).replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase())
