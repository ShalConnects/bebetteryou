import { readyNetworks } from '@/libs/social'
import { emptyPostDays, slotOnDate } from '@/libs/social/post-slot'
import { createSchedule, listAllSchedules } from '@/libs/social/schedule-store'
import { readQuotes } from '@/libs/quotes-store'

/** Put saved drafts (oldest first) on the empty card days of the next `days`, on every ready network. */
export async function fillPostDays(days = 14) {
  const [quotes, schedules, networks] = await Promise.all([readQuotes(), listAllSchedules(), readyNetworks()])
  const queued = new Set(schedules.filter((s) => s.status === 'pending').map((s) => s.slug))
  const drafts = quotes.filter((q) => q.status === 'draft' && !queued.has(q.slug)).sort((a, b) => a.n - b.n)
  const ready = networks.filter((n) => n.ready).map((n) => n.id)
  const dates = emptyPostDays(schedules, days).slice(0, drafts.length)
  const created = []
  // One at a time: the local JSON store can't take parallel writes.
  for (const [i, date] of dates.entries()) {
    created.push(await createSchedule({ slug: drafts[i].slug, networks: ready, runAt: slotOnDate(date) }))
  }
  return { created, emptyLeft: emptyPostDays([...schedules, ...created], days).length }
}
