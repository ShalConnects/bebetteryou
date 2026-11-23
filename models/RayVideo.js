import mongoose from 'mongoose'

/** One Ray talking-avatar video per quote card: script → Higgsfield → captions → posted. */
const RayVideoSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true },
    /** The card's 8 pm slot this video posts at. */
    postAt: { type: Date },
    hook: { type: String, default: '' },
    script: { type: String, default: '' },
    status: {
      type: String,
      enum: ['draft', 'approved', 'generating', 'ready', 'posted', 'failed'],
      default: 'draft',
    },
    requestId: { type: String, default: '' },
    costUsd: { type: Number, default: 0 },
    submittedAt: { type: Date },
    videoUrl: { type: String, default: '' },
    results: { type: mongoose.Schema.Types.Mixed, default: undefined },
    error: { type: String, default: '' },
  },
  { timestamps: true }
)

export default mongoose.models.RayVideo || mongoose.model('RayVideo', RayVideoSchema)
