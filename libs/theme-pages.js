import { themeLanes } from '@/config/themes'
import { traditions } from '@/config/traditions'
import { listQuotes } from '@/libs/content'
import { getScriptureBook, themesForQuote } from '@/libs/scripture'
import { themesMap } from '@/libs/tag-lane'
import { readTags } from '@/libs/tags-store'

/** The 15 themes, each mood lane followed by its finer themes. */
export const allThemes = Object.entries(themeLanes).flatMap(([lane, subs]) => [lane, ...subs])
const laneOf = Object.fromEntries(Object.entries(themeLanes).flatMap(([lane, subs]) => subs.map((s) => [s, lane])))
export const passageTraditions = traditions.filter((t) => t.id !== 'none')

/** Cards for a theme: pinned first, then tag lane, then the theme's parent lane; newest first within each. */
export function cardsForTheme(quotes, theme, map) {
  const rank = (q) => {
    const themes = themesForQuote(q.tags, q.theme, map)
    return themes[0] === theme ? 0 : themes.includes(theme) ? 1 : themes.includes(laneOf[theme]) ? 2 : 3
  }
  return quotes
    .map((q) => [rank(q), q])
    .filter(([r]) => r < 3)
    .sort((a, b) => a[0] - b[0] || b[1].n - a[1].n)
    .map(([, q]) => q)
}

/** Everything a theme page or guide needs, in one read. */
export async function themeContext(theme) {
  const [quotes, tags, book] = await Promise.all([listQuotes(), readTags(), getScriptureBook()])
  return {
    cards: cardsForTheme(quotes, theme, themesMap(tags)),
    passages: (tradition) => (book[tradition]?.[theme] || []).filter((p) => p.verified !== false),
  }
}
