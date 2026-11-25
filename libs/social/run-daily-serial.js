import { serialNetworks, serialPerDay } from '@/config/social'
import { logInfo } from '@/libs/logger'
import { postQuote, readyNetworks } from '@/libs/social'
import { readPostsBySlugs } from '@/libs/social/post-store'
import { readQuotes } from '@/libs/quotes-store'
import { notOnNetwork } from '@/libs/social/run-daily-youtube-short'

/**
 * Up to `serialPerDay` cards a day per serial network (X), lowest card number not yet there.
 * Catches up from #1, then keeps pace with the schedule (the new card is the only one left).
 */
export async function runDailySerial({ now = new Date() } = {}) {
  const ready = new Set((await readyNetworks()).filter((n) => n.ready).map((n) => n.id))
  const quotes = await readQuotes()
  const posts = await readPostsBySlugs(quotes.map((q) => q.slug).filter(Boolean))
  const today = now.toISOString().slice(0, 10)
  const out = {}
  for (const id of serialNetworks) {
    const done = Object.values(posts).filter((p) => p[id]?.ok && String(p[id].at || '').startsWith(today)).length
    const queue = notOnNetwork(quotes, posts, id).slice(0, Math.max(0, serialPerDay - done))
    if (!ready.has(id)) out[id] = { skipped: true, reason: 'not_ready' }
    else if (!queue.length) out[id] = { skipped: true, reason: done ? 'already_posted_today' : 'caught_up' }
    else {
      out[id] = []
      for (const q of queue) {
        const [result] = await postQuote(q.slug, [id])
        out[id].push({ slug: q.slug, n: q.n, ok: result.ok, error: result.error || '' })
      }
    }
    logInfo('Daily serial post', { network: id, result: out[id] })
  }
  return out
}
