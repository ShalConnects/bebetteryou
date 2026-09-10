import { resolveKnownTheme } from '@/libs/tag-lane'
import { renderQuoteCard } from './quote-card.mjs'
import { saveQuoteImage } from './quote-assets'
import { normalizeAuthor } from './quote-text'
import { appendQuote, nextQuoteN, readQuotes } from './quotes-store'
import { readTags, tagNames } from './tags-store'

/** Render card + persist image & catalog. */
export async function createQuote({ text, author = '', tags = [], theme = '' }) {
  const quotes = await readQuotes()
  const n = nextQuoteN(quotes)
  const slug = `bby-${n}`
  const file = `bby${n}.jpg`
  const credit = normalizeAuthor(author)
  const tagRows = await readTags()
  const catalog = tagNames(tagRows)
  const src = await saveQuoteImage(file, await renderQuoteCard({ n, text, author: credit }))
  const known = resolveKnownTheme(theme, tagRows)

  const quote = {
    slug,
    n,
    src,
    text,
    author: credit,
    tags: tags.filter((t) => catalog.includes(t)),
    ...(known ? { theme: known } : {}),
  }
  await appendQuote(quote)
  return quote
}
