import { postQuote } from '@/libs/social'
import { claimDueSchedules, finishSchedule } from '@/libs/social/schedule-store'
import { logError } from '@/libs/logger'

/** Run due social schedules. Returns a short summary for the cron response. */
export async function runDueSocialSchedules({ now = new Date(), limit = 5 } = {}) {
  const claimed = await claimDueSchedules(now, limit)
  const outcomes = []

  for (const job of claimed) {
    const id = String(job._id || job.id)
    try {
      const results = await postQuote(job.slug, job.networks)
      const ok = results.some((r) => r.ok)
      const error = results
        .filter((r) => !r.ok)
        .map((r) => `${r.id}: ${r.error || 'Failed'}`)
        .join('; ')
      await finishSchedule(id, { ok, results, error })
      outcomes.push({ id, slug: job.slug, ok, results })
    } catch (error) {
      logError('Scheduled social post failed', error, { id, slug: job.slug })
      await finishSchedule(id, { ok: false, results: [], error: error.message || 'Failed' })
      outcomes.push({ id, slug: job.slug, ok: false, error: error.message || 'Failed' })
    }
  }

  return { claimed: claimed.length, outcomes }
}
