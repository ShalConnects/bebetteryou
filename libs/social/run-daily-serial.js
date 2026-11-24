import { serialNetworks } from '@/config/social'
import { logInfo } from '@/libs/logger'
import { postQuote, readyNetworks } from '@/libs/social'
import { hasOkNetworkPostInUtcDay, readPostsBySlugs } from '@/libs/social/post-store'
import { readQuotes } from '@/libs/quotes-store'
import { notOnNetwork } from '@/libs/social/run-daily-youtube-short'

/**
 * One card a day per serial network (X), lowest card number not yet there. Catches up from #1,
 * then keeps pace with the schedule (a new card is the only one left). Never two in a day.
 */
export async function runDailySerial({ now = new Date() } = {}) {
  const ready = new Set((await readyNetworks()).filter((n) => n.ready).map((n) => n.id))
  const quotes = await readQuotes()
  const posts = await readPostsBySlugs(quotes.map((q) => q.slug).filter(Boolean))
  const out = {}
  for (const id of serialNetworks) {
    if (!ready.has(id)) out[id] = { skipped: true, reason: 'not_ready' }
    else if (await hasOkNetworkPostInUtcDay(id, { now })) out[id] = { skipped: true, reason: 'already_posted_today' }
    else {
      const queue = notOnNetwork(quotes, posts, id)
      if (!queue.length) out[id] = { skipped: true, reason: 'caught_up' }
      else {
        const [result] = await postQuote(queue[0].slug, [id])
        out[id] = { slug: queue[0].slug, n: queue[0].n, ok: result.ok, error: result.error || '', left: queue.length - (result.ok ? 1 : 0) }
      }
    }
    logInfo('Daily serial post', { network: id, ...out[id] })
  }
  return out
}
