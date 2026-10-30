import { traditions } from '@/config/traditions'
import { getScriptureBook, scriptureFor, scriptureShareText } from '@/libs/scripture'
import { themesMap } from '@/libs/tag-lane'
import { readTags } from '@/libs/tags-store'
import { quoteCaption, resolveQuoteImageBuffer } from '@/libs/social'
import { readPostsBySlugs, recordPost } from '@/libs/social/post-store'
import { postYouTube, youtubeTitle } from '@/libs/social/providers/youtube'
import { encodeQuoteShort } from '@/libs/social/quote-short'

/** Traditions with passages, in daily rotation order. */
const lanes = traditions.filter((t) => t.id !== 'none')
const DAY = 86_400_000

/** Post-log key: one verse Short per quote × tradition, ever. */
export const verseKey = (slug, tradition) => `verse-${slug}-${tradition}`

/**
 * Today's tradition first (rotates daily), then the others; within each, the oldest quote
 * that has a passage and hasn't gone out with it yet. `quotes` = eligible cards, oldest first.
 */
export function pickVerseShort(quotes, posted, book, map, now = Date.now()) {
  const day = Math.floor(now / DAY)
  for (let k = 0; k < lanes.length; k++) {
    const { id: tradition, label } = lanes[(day + k) % lanes.length]
    for (const quote of quotes) {
      const key = verseKey(quote.slug, tradition)
      if (posted[key]?.youtube?.ok) continue
      const passage = scriptureFor(book, tradition, quote.tags, quote.slug, null, quote.theme, map)
      if (passage) return { quote, tradition, label, passage, key }
    }
  }
  return null
}

/** Pick, encode and upload today's verse Short; logs under its verse key. */
export async function postVerseShort(quotes, now) {
  const keys = quotes.flatMap((q) => lanes.map((t) => verseKey(q.slug, t.id)))
  const [book, tags, posted] = await Promise.all([getScriptureBook(), readTags(), readPostsBySlugs(keys)])
  const pick = pickVerseShort(quotes, posted, book, themesMap(tags), now)
  if (!pick) return null

  const { quote, label, passage, key } = pick
  const result = { id: 'youtube', label: 'YouTube Shorts', slug: quote.slug, tradition: pick.tradition }
  try {
    const encoded = await encodeQuoteShort(await resolveQuoteImageBuffer(quote.src), quote, { passage })
    const posted = await postYouTube({
      ...encoded,
      quote: { ...quote, tags: [...(quote.tags || []), label] },
      caption: scriptureShareText(await quoteCaption(quote, 'youtube'), passage),
      title: `${youtubeTitle(quote)} · ${passage.ref}`.slice(0, 100),
    })
    Object.assign(result, { ok: true, url: posted.url, privacy: posted.privacy, channel: posted.channel })
  } catch (err) {
    Object.assign(result, { ok: false, error: err.message || 'Failed' })
  }
  await recordPost(key, result)
  return { key, result }
}
