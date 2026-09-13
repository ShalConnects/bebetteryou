import mongoose from 'mongoose'

const SocialPostSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, index: true },
    network: { type: String, required: true },
    ok: { type: Boolean, required: true },
    at: { type: Date, required: true },
    error: { type: String, default: '' },
    url: { type: String, default: '' },
    privacy: { type: String, default: '' },
    channel: { type: String, default: '' },
  },
  { timestamps: true }
)

SocialPostSchema.index({ slug: 1, network: 1 }, { unique: true })

export default mongoose.models.SocialPost || mongoose.model('SocialPost', SocialPostSchema)
