/**
 * Schedule #1–#7 once per day at peak visibility time (14:00 UTC).
 *   node --env-file=.env.local scripts/schedule-week.mjs
 *   node --env-file=.env.local scripts/schedule-week.mjs --apply
 */
import mongoose from 'mongoose'
import { mongoUri } from '../libs/mongo-uri.js'

const apply = process.argv.includes('--apply')

/** Ready networks for the first week — skip pending APIs (LinkedIn, Pinterest). */
const NETWORKS = ['instagram', 'threads', 'facebook', 'x', 'youtube', 'bluesky', 'telegram']

/** 14:00 UTC ≈ 10am US East / 3pm UK / 8pm Bangladesh — strong cross-region slot. */
const HOUR_UTC = 14
const START_N = 1
const DAYS = 7

const SocialScheduleSchema = new mongoose.Schema(
  {
    slug: String,
    networks: [String],
    runAt: Date,
    status: String,
    error: String,
    results: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
)

function nextDaysAtUtc(count, hour) {
  const out = []
  const now = new Date()
  // First slot: tomorrow at HOUR_UTC (or today if we are still before that hour UTC).
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, 0, 0))
  if (start.getTime() <= now.getTime() + 60_000) {
    start.setUTCDate(start.getUTCDate() + 1)
  }
  for (let i = 0; i < count; i++) {
    const d = new Date(start)
    d.setUTCDate(start.getUTCDate() + i)
    out.push(d)
  }
  return out
}

async function main() {
  const uri = mongoUri()
  if (!uri) throw new Error('MONGODB_URI required')

  const slots = nextDaysAtUtc(DAYS, HOUR_UTC)
  const plan = slots.map((runAt, i) => ({
    n: START_N + i,
    slug: `bby-${START_N + i}`,
    runAt: runAt.toISOString(),
    networks: NETWORKS,
  }))

  console.log(JSON.stringify({ apply, hourUtc: HOUR_UTC, plan }, null, 2))
  if (!apply) return

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 })
  const SocialSchedule =
    mongoose.models.SocialSchedule || mongoose.model('SocialSchedule', SocialScheduleSchema)

  // Replace any pending week-1 schedules so re-runs stay clean.
  const slugs = plan.map((p) => p.slug)
  await SocialSchedule.deleteMany({ slug: { $in: slugs }, status: 'pending' })

  const inserted = await SocialSchedule.insertMany(
    plan.map((p) => ({
      slug: p.slug,
      networks: p.networks,
      runAt: new Date(p.runAt),
      status: 'pending',
      error: '',
    }))
  )

  await mongoose.disconnect()
  console.log(JSON.stringify({ scheduled: inserted.map((r) => ({ id: String(r._id), slug: r.slug, runAt: r.runAt })) }, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
