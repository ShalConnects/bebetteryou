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
    /** Public pages only list the current cardRevision. */
    rev: { type: Number },
    /**
     * Site visibility. Missing = legacy published.
     * draft/scheduled stay off the public site until publish.
     */
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'published'],
    },
    /** When a scheduled quote is meant to go live (ISO via lean docs). */
    publishAt: { type: Date },
    /** Tombstone for a card that still exists in data/quotes.json (Vercel can't edit the file). */
    deleted: { type: Boolean },
    related: {
      books: { type: [String], default: undefined },
      posts: { type: [String], default: undefined },
    },
  },
  { timestamps: true }
)

export default mongoose.models.Quote || mongoose.model('Quote', QuoteSchema)
