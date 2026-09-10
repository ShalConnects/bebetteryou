import mongoose from 'mongoose'

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    select: false, // Don't include password in queries by default
  },
  image: {
    type: String,
  },
  stripeCustomerId: {
    type: String,
  },
  lsCustomerId: {
    type: String,
  },
  lsVariantId: {
    type: String,
  },
  hasAccess: {
    type: Boolean,
    default: false,
  },
  subscriptionStatus: {
    type: String,
    enum: ['active', 'canceled', 'past_due', 'unpaid', 'none'],
    default: 'none',
  },
  subscriptionId: {
    type: String,
  },
  traditionPreference: {
    type: String,
    default: null,
  },
  showPassages: {
    type: Boolean,
    default: true,
  },
  translationPreference: {
    type: String,
    default: 'niv',
  },
  magicTokenHash: {
    type: String,
    select: false,
  },
  magicTokenExpires: {
    type: Date,
    select: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
})

// Update the updatedAt field before saving
UserSchema.pre('save', function(next) {
  this.updatedAt = Date.now()
  next()
})

export default mongoose.models.User || mongoose.model('User', UserSchema)
