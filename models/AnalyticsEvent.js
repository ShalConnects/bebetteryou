import mongoose from 'mongoose'
import { analyticsEventNames, retentionDays } from '@/config/analytics'

/**
 * One row per tracked interaction. Deliberately holds nothing that identifies a
 * person: `visitor` is a salted hash that rotates daily, so rows cannot be
 * stitched into a profile across days and there is nothing to delete on request.
 */
const AnalyticsEventSchema = new mongoose.Schema({
  name: { type: String, required: true, enum: analyticsEventNames },
  /** Pathname only — query strings can carry email addresses and tokens. */
  path: { type: String, default: '' },
  /** Quote slug for download and share events. */
  slug: { type: String, default: '' },
  /** Share destination id, e.g. `pinterest`. */
  target: { type: String, default: '' },
  channel: { type: String, default: 'direct' },
  source: { type: String, default: '' },
  campaign: { type: String, default: '' },
  referrer: { type: String, default: '' },
  visitor: { type: String, required: true },
  device: { type: String, default: '' },
  country: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
})

/** Every dashboard query is "this range, maybe this event type". */
AnalyticsEventSchema.index({ createdAt: -1, name: 1 })
AnalyticsEventSchema.index({ createdAt: -1, channel: 1 })

/** Mongo expires old rows on its own, so the collection cannot grow forever. */
AnalyticsEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: retentionDays * 24 * 60 * 60 })

export default mongoose.models.AnalyticsEvent ||
  mongoose.model('AnalyticsEvent', AnalyticsEventSchema)
