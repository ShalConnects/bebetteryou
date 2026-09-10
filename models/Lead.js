import mongoose from 'mongoose'

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

LeadSchema.pre('save', function (next) {
  this.updatedAt = Date.now()
  next()
})

export default mongoose.models.Lead || mongoose.model('Lead', LeadSchema)
