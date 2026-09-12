import { normalizeRelated } from '@/libs/related'
import { normalizeTheme, themeSet } from '@/libs/tag-lane'
import { assertQuoteFits, cardRevision, renderQuoteCard } from './quote-card.mjs'
import { deleteQuoteImage, saveQuoteImage } from './quote-assets'
import { normalizeAuthor, normalizeQuoteText } from './quote-text'
import { appendQuote, readQuotes, removeQuote } from './quotes-store'
import { readTags, tagNames } from './tags-store'

function cardFile(n) {
  return `bby${n}.jpg`
}

export { normalizeRelated }

export async function updateQuote(slug, { text, author, tags, theme, related, regenerate = false }) {
  const existing = (await readQuotes()).find((q) => q.slug === slug)
  if (!existing) throw new Error('Quote not found')

  const nextText = text !== undefined ? normalizeQuoteText(text) : existing.text || ''
  if (text !== undefined) assertQuoteFits(nextText)

  const tagRows = await readTags()
  const catalog = tagNames(tagRows)
  const next = {
    ...existing,
    text: nextText,
    author: author !== undefined ? normalizeAuthor(author) : existing.author || '',
    tags: Array.isArray(tags) ? tags.filter((t) => catalog.includes(t)) : existing.tags || [],
  }

  if (theme !== undefined) {
    const resolved = normalizeTheme(theme)
    if (resolved && themeSet(tagRows).has(resolved)) next.theme = resolved
    else delete next.theme
  }

  if (related !== undefined) {
    const pins = normalizeRelated(related)
    if (pins) next.related = pins
    else delete next.related
  }

  if (regenerate) {
    if (!next.text) throw new Error('text required to regenerate')
    assertQuoteFits(next.text)
    next.src = await saveQuoteImage(
      cardFile(existing.n),
      await renderQuoteCard({ n: existing.n, text: next.text, author: next.author })
    )
    next.rev = cardRevision
  }

  await appendQuote(next)
  return next
}

export async function deleteQuote(slug) {
  const existing = (await readQuotes()).find((q) => q.slug === slug)
  if (!existing) throw new Error('Quote not found')
  await removeQuote(slug)
  deleteQuoteImage(existing.n)
  return existing
}
