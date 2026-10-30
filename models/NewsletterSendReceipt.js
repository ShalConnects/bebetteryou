import mongoose from 'mongoose'

/** One recipient already mailed for a specific update. */
const NewsletterSendReceiptSchema = new mongoose.Schema({
  contentKey: { type: String, required: true },
  email: { type: String, required: true },
  status: { type: String, enum: ['sent', 'failed'], required: true },
  createdAt: { type: Date, default: Date.now },
})

NewsletterSendReceiptSchema.index({ contentKey: 1, email: 1 }, { unique: true })

export default mongoose.models.NewsletterSendReceipt ||
  mongoose.model('NewsletterSendReceipt', NewsletterSendReceiptSchema)
