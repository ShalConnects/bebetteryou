import mongoose from 'mongoose'

const ScriptureSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'catalog', unique: true },
    data: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
)

export default mongoose.models.Scripture || mongoose.model('Scripture', ScriptureSchema)
