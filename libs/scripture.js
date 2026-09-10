import scriptureSeed from '@/data/scripture.json'
import { readScripture } from '@/libs/scripture-store'
export {
  themesForTags,
  themesForQuote,
  quoteShowsScripture,
  themeEntries,
  seedFromKey,
  resolveTranslation,
  scriptureFor,
  scriptureShareText,
} from '@/libs/scripture-core'

/** Server-side catalog (Mongo → file → seed). */
export async function getScriptureBook() {
  try {
    const data = await readScripture()
    return Object.keys(data).length ? data : scriptureSeed
  } catch {
    return scriptureSeed
  }
}
