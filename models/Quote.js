import mongoose from 'mongoose'

const QuoteSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    n: { type: Number, required: true, index: true },
    src: { type: String, required: true },
    text: { type: String, required: true },
    author: { type: String, default: '' },
    tags: { type: [String], default: [] },
  },
  { timestamps: true }
)

export default mongoose.models.Quote || mongoose.model('Quote', QuoteSchema)
