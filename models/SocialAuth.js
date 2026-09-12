import mongoose from 'mongoose'

const SocialAuthSchema = new mongoose.Schema(
  {
    network: { type: String, required: true, unique: true },
    refreshToken: { type: String, required: true },
  },
  { timestamps: true }
)

export default mongoose.models.SocialAuth || mongoose.model('SocialAuth', SocialAuthSchema)
