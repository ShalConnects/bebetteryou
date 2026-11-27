import mongoose from 'mongoose'

/** One trend card a day: drafted at 8 pm, posted at 11 pm Bangladesh once approved. */
const TrendPostSchema = new mongoose.Schema(
  {
    date: { type: String, required: true, unique: true },
    source: { type: String, default: '' },
    topic: { type: String, default: '' },
    hashtag: { type: String, default: '' },
    text: { type: String, default: '' },
    tags: { type: [String], default: [] },
    theme: { type: String, default: '' },
    src: { type: String, default: '' },
    status: { type: String, enum: ['draft', 'approved', 'posted', 'skipped'], default: 'draft' },
    results: { type: mongoose.Schema.Types.Mixed, default: undefined },
    error: { type: String, default: '' },
  },
  { timestamps: true }
)

export default mongoose.models.TrendPost || mongoose.model('TrendPost', TrendPostSchema)
