import mongoose from 'mongoose'

/** One quote, blog, book, or digest update being mailed to the whole list. */
const NewsletterSendJobSchema = new mongoose.Schema({
  kind: { type: String, enum: ['quote', 'blog', 'book', 'digest'], required: true },
  /** quote:bby-1,bby-2 or blog:slug */
  contentKey: { type: String, required: true },
  slugs: { type: [String], default: [] },
  /** UTC day for merging quote updates before the first send. */
  dayKey: String,
  status: {
    type: String,
    enum: ['queued', 'sending', 'done', 'failed'],
    default: 'queued',
  },
  cursor: { type: mongoose.Schema.Types.ObjectId, default: null },
  eligible: { type: Number, default: 0 },
  sent: { type: Number, default: 0 },
  failed: { type: Number, default: 0 },
  error: String,
  lockedAt: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  finishedAt: Date,
})

NewsletterSendJobSchema.index({ status: 1, createdAt: 1 })
NewsletterSendJobSchema.index({ contentKey: 1, status: 1 })
NewsletterSendJobSchema.index({ kind: 1, dayKey: 1, status: 1 })

export default mongoose.models.NewsletterSendJob ||
  mongoose.model('NewsletterSendJob', NewsletterSendJobSchema)
