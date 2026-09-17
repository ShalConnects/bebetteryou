import mongoose from 'mongoose'

const SocialScheduleSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, index: true },
    networks: { type: [String], default: [] },
    runAt: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'running', 'done', 'failed', 'canceled'],
      default: 'pending',
      index: true,
    },
    results: { type: mongoose.Schema.Types.Mixed, default: undefined },
    error: { type: String, default: '' },
  },
  { timestamps: true }
)

SocialScheduleSchema.index({ status: 1, runAt: 1 })

export default mongoose.models.SocialSchedule || mongoose.model('SocialSchedule', SocialScheduleSchema)
