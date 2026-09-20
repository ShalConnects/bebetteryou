import mongoose from 'mongoose'

/** Resend delivery problems (bounce / spam complaint) for newsletter hygiene. */
const NewsletterDeliveryEventSchema = new mongoose.Schema({
  email: { type: String, required: true },
  type: { type: String, enum: ['bounced', 'complained'], required: true },
  subject: String,
  emailId: String,
  bounceType: String,
  bounceSubType: String,
  message: String,
  createdAt: { type: Date, default: Date.now },
})

NewsletterDeliveryEventSchema.index({ createdAt: -1 })
NewsletterDeliveryEventSchema.index({ email: 1, createdAt: -1 })
NewsletterDeliveryEventSchema.index(
  { emailId: 1, type: 1 },
  { unique: true, partialFilterExpression: { emailId: { $type: 'string' } } }
)
/** Keep ~1 year of bounce/complaint history. */
NewsletterDeliveryEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 })

export default mongoose.models.NewsletterDeliveryEvent ||
  mongoose.model('NewsletterDeliveryEvent', NewsletterDeliveryEventSchema)
