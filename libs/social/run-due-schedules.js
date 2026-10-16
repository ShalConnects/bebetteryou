import { postQuote, readyNetworks } from '@/libs/social'
import { networksNeedingPost } from '@/libs/social/post-log'
import { readPosts } from '@/libs/social/post-store'
import { claimDueSchedules, finishSchedule, requeueSchedule } from '@/libs/social/schedule-store'
import { publishQuote } from '@/libs/quotes-store'
import { logError } from '@/libs/logger'

/** Run due social schedules. Publishes the quote to the site, then posts social. */
export async function runDueSocialSchedules({ now = new Date(), limit = 5 } = {}) {
  const claimed = await claimDueSchedules(now, limit)
  const outcomes = []
  const statusList = await readyNetworks()
  const labels = Object.fromEntries(statusList.map((n) => [n.id, n.label]))

  for (const job of claimed) {
    const id = String(job._id || job.id)
    try {
      await publishQuote(job.slug)

      const posts = await readPosts(job.slug)
      const requested = Array.isArray(job.networks) ? job.networks : []
      const toPost = networksNeedingPost(requested, posts)
      const skipped = requested
        .filter((net) => posts[net]?.ok)
        .map((net) => ({
          id: net,
          label: labels[net] || net,
          ok: true,
          skipped: true,
          url: posts[net]?.url || null,
          error: '',
        }))

      if (!toPost.length) {
        await finishSchedule(id, { ok: true, results: skipped, error: '' })
        outcomes.push({ id, slug: job.slug, ok: true, skipped: skipped.length, results: skipped })
        continue
      }

      const posted = await postQuote(job.slug, toPost)
      const results = [...skipped, ...posted]
      const failed = results.filter((r) => !r.ok)
      const error = failed.map((r) => `${r.id}: ${r.error || 'Failed'}`).join('; ')
      const allOk = results.length > 0 && failed.length === 0
      const partial = !allOk && results.some((r) => r.ok)
      if (partial) {
        await requeueSchedule(id, { results, error })
        outcomes.push({ id, slug: job.slug, ok: false, partial: true, skipped: skipped.length, results })
      } else {
        await finishSchedule(id, { ok: allOk, results, error })
        outcomes.push({ id, slug: job.slug, ok: allOk, skipped: skipped.length, results })
      }
    } catch (error) {
      logError('Scheduled social post failed', error, { id, slug: job.slug })
      await finishSchedule(id, { ok: false, results: [], error: error.message || 'Failed' })
      outcomes.push({ id, slug: job.slug, ok: false, error: error.message || 'Failed' })
    }
  }

  return { claimed: claimed.length, outcomes }
}
