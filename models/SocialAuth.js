import mongoose from 'mongoose'

/**
 * Per-network credentials saved from the Integrations dashboard.
 * YouTube historically only stored refreshToken; other networks use accessToken + extras.
 */
const SocialAuthSchema = new mongoose.Schema(
  {
    network: { type: String, required: true, unique: true },
    accessToken: { type: String, default: '' },
    refreshToken: { type: String, default: '' },
    /** Board/page/chat ids, handles, X secrets, etc. */
    extras: { type: mongoose.Schema.Types.Mixed, default: {} },
    lastError: { type: String, default: '' },
    lastOkAt: { type: Date },
  },
  { timestamps: true }
)

export default mongoose.models.SocialAuth || mongoose.model('SocialAuth', SocialAuthSchema)
