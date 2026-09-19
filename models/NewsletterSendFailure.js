import mongoose from 'mongoose'

/** Failed Resend deliveries for quote batches (still counted toward 30-day cooldown). */
const NewsletterSendFailureSchema = new mongoose.Schema({
  email: { type: String, required: true },
  kind: { type: String, enum: ['quote', 'digest'], required: true },
  slug: String,
  subject: String,
  error: { type: String, default: 'Send failed' },
  createdAt: { type: Date, default: Date.now },
})

NewsletterSendFailureSchema.index({ createdAt: -1 })
NewsletterSendFailureSchema.index({ email: 1, createdAt: -1 })
/** Keep failure history ~90 days. */
NewsletterSendFailureSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 })

export default mongoose.models.NewsletterSendFailure ||
  mongoose.model('NewsletterSendFailure', NewsletterSendFailureSchema)
