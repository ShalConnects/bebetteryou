import mongoose from 'mongoose'

const QuoteSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    n: { type: Number, required: true, index: true },
    src: { type: String, required: true },
    text: { type: String, required: true },
    author: { type: String, default: '' },
    tags: { type: [String], default: [] },
    theme: { type: String, default: '' },
    related: {
      books: { type: [String], default: undefined },
      posts: { type: [String], default: undefined },
    },
  },
  { timestamps: true }
)

export default mongoose.models.Quote || mongoose.model('Quote', QuoteSchema)
