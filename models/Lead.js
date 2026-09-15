import mongoose from 'mongoose'

const PrefsSchema = new mongoose.Schema(
  {
    quotes: { type: Boolean, default: true },
    blog: { type: Boolean, default: true },
    books: { type: Boolean, default: true },
  },
  { _id: false }
)

const LeadSchema = new mongoose.Schema({
  name: String,
  email: {
    type: String,
    required: true,
  },
  message: String,
  source: {
    type: String,
    default: 'website',
  },
  prefs: {
    type: PrefsSchema,
    default: () => ({ quotes: true, blog: true, books: true }),
  },
  unsubscribeToken: String,
  unsubscribedAt: Date,
  welcomeSentAt: Date,
  status: {
    type: String,
    enum: ['new', 'contacted', 'qualified', 'converted', 'lost'],
    default: 'new',
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

LeadSchema.index({ email: 1, source: 1 }, { unique: true, partialFilterExpression: { source: 'newsletter' } })
LeadSchema.index({ unsubscribeToken: 1 }, { unique: true, sparse: true })

LeadSchema.pre('save', function (next) {
  this.updatedAt = Date.now()
  next()
})

export default mongoose.models.Lead || mongoose.model('Lead', LeadSchema)
