import { revalidatePath } from 'next/cache'
import { trendRules, trends } from '@/config/trends'
import { askJson } from '@/libs/ai'
import { renderQuoteCard } from '@/libs/quote-card.mjs'
import { saveQuoteImage } from '@/libs/quote-assets'
import { postCard } from '@/libs/social'
import { postTelegram } from '@/libs/social/providers/telegram'
import { readTags, tagNames } from '@/libs/tags-store'
import { getSiteUrl } from '@/libs/site-url'
import { readers, sourceOrder } from './sources'
import { readTrends, saveTrend } from './store'

const dayOf = (now) => now.toISOString().slice(0, 10)
const pastPostHour = (date, now) => now >= new Date(`${date}T${String(trends.postHourUtc).padStart(2, '0')}:00:00Z`)

/** The card-shaped object the social posters take. */
export const trendCard = (row) => ({
  slug: `trend-${row.date}`,
  text: row.text,
  author: trends.author,
  tags: row.tags,
  src: row.src,
  trend: { topic: row.topic, hashtag: row.hashtag },
})

/** Ask the AI to pick the safest, most uplifting topic and write an original quote for it (or none). */
async function pickAndWrite(list, tags) {
  if (!list.length) return null
  const lines = list.slice(0, 20).map((t, i) => `${i + 1}. ${t.topic}${t.context ? ` — ${t.context}` : ''}`)
  const out = await askJson({
    models: trends.models,
    system: `You write original, short motivational quotes for a quote-card brand, inspired by what people are talking about today.\n${trendRules}\nNever reuse a famous quote. Reply with JSON only.`,
    prompt: `Today's US trends:\n${lines.join('\n')}\n\nPick the one trend that is safe and gives the best uplifting angle, or none.\nTags: ${tags.join(', ')}\nReply {"pick": number or null, "topic": "short plain name", "hashtag": "OneWordOrCamelCase", "text": "quote, 8-22 words", "tag": "one of the tags"}`,
  })
  return out.pick && out.text && tags.includes(out.tag) ? out : null
}

/** 8 pm run: draft today's trend card from the source whose turn it is, falling back to the next. `force` drafts on a Friday too. */
export async function draftTrend(now = new Date(), { force = false } = {}) {
  const date = dayOf(now)
  if (!force && now.getUTCDay() === trends.skipWeekday) return { skipped: true, reason: 'friday' }
  if ((await readTrends({ date })).length) return { skipped: true, reason: 'already drafted' }
  const tagRows = await readTags()
  const tags = tagNames(tagRows)
  const tried = []
  for (const source of sourceOrder(date)) {
    let list
    try {
      list = await readers[source]()
    } catch (err) {
      tried.push(`${source}: ${err.message}`)
      continue
    }
    // An AI failure (key, credit) stops here: the next source would hit the same error.
    const pick = await pickAndWrite(list, tags)
    tried.push(`${source}: ${pick ? 'picked' : 'nothing safe'}`)
    if (!pick) continue
    const image = await renderQuoteCard({ n: trends.label, text: pick.text, author: trends.author, tags: [pick.tag] })
    const row = await saveTrend(date, {
      source,
      topic: pick.topic,
      hashtag: pick.hashtag.replace(/[^\w]/g, ''),
      text: pick.text,
      tags: [pick.tag],
      theme: tagRows.find((t) => t.name === pick.tag)?.theme || '',
      src: await saveQuoteImage(`trend-${date}.jpg`, image),
      status: 'draft',
      error: '',
    })
    await postTelegram({
      alert: true,
      imageBuffer: image,
      caption: `Trend draft (${source}: ${row.topic})\n\n"${row.text}"\n\nApprove by 11 pm: ${getSiteUrl()}/dashboard/quotes?section=trend`,
    }).catch(() => {})
    return { ...row, tried }
  }
  return { skipped: true, reason: 'nothing safe', tried }
}

/** Post an approved row to every ready network. */
async function publish(row) {
  const results = await postCard(trendCard(row))
  try {
    revalidatePath('/trends')
  } catch {}
  return saveTrend(row.date, {
    results,
    status: results.some((r) => r.ok) ? 'posted' : 'approved',
    error: results.filter((r) => !r.ok).map((r) => `${r.id}: ${r.error}`).join('; '),
  })
}

/** 11 pm run: post today's approved trend card. */
export async function postTrend(now = new Date()) {
  const [row] = await readTrends({ date: dayOf(now), status: 'approved' })
  return row ? publish(row) : { skipped: true }
}

/** Dashboard: save an edit, approve or skip. Approving after 11 pm posts at once. */
export async function updateTrend({ date, text, action }, now = new Date()) {
  const [row] = await readTrends({ date })
  if (!row) throw new Error('No trend draft for that day')
  if (row.status === 'posted') throw new Error('Already posted')
  if (date !== dayOf(now)) throw new Error('That trend has passed')
  let patch = { status: { approve: 'approved', skip: 'skipped' }[action] || row.status }
  if (text?.trim() && text.trim() !== row.text) {
    const image = await renderQuoteCard({ n: trends.label, text: text.trim(), author: trends.author, tags: row.tags })
    patch = { ...patch, text: text.trim(), src: await saveQuoteImage(`trend-${date}-${Date.now()}.jpg`, image) }
  }
  const saved = await saveTrend(date, patch)
  return action === 'approve' && pastPostHour(date, now) ? publish(saved) : saved
}
