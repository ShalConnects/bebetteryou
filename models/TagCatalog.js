import mongoose from 'mongoose'

const TagCatalogSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'catalog', unique: true },
    tags: { type: [mongoose.Schema.Types.Mixed], default: [] },
  },
  { timestamps: true }
)

export default mongoose.models.TagCatalog || mongoose.model('TagCatalog', TagCatalogSchema)
