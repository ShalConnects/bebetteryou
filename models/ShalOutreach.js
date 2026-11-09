import mongoose from 'mongoose'

/** ShalConnects outreach contacts — separate from BeBetterYou newsletter leads. */
const ContactSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
)
ContactSchema.index({ createdAt: 1 })

const SentSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    day: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)
SentSchema.index({ email: 1 }, { unique: true })
SentSchema.index({ day: 1 })

const StopSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    reason: { type: String, default: 'unsubscribe' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

const EventSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  type: { type: String, enum: ['bounced', 'complained'], required: true },
  emailId: String,
  bounceType: String,
  bounceSubType: String,
  message: String,
  createdAt: { type: Date, default: Date.now },
})
EventSchema.index({ createdAt: -1 })
EventSchema.index(
  { emailId: 1, type: 1 },
  { unique: true, partialFilterExpression: { emailId: { $type: 'string' } } }
)

const RemovedSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  reason: { type: String, default: '' },
  day: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
})
RemovedSchema.index({ createdAt: -1 })

const LockSchema = new mongoose.Schema({
  _id: { type: String, default: 'send' },
  lockedUntil: { type: Date, required: true },
  owner: { type: String, default: '' },
  /** Live + last-finished batch progress for the dashboard. */
  progress: {
    phase: { type: String, default: 'idle' }, // idle|preparing|sending|done|error
    total: { type: Number, default: 0 },
    done: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    startedAt: { type: Date, default: null },
    finishedAt: { type: Date, default: null },
    currentEmail: { type: String, default: '' },
    lastError: { type: String, default: '' },
    avgMs: { type: Number, default: 0 },
    etaSeconds: { type: Number, default: null },
  },
})

export const ShalOutreachContact =
  mongoose.models.ShalOutreachContact || mongoose.model('ShalOutreachContact', ContactSchema)
export const ShalOutreachSent =
  mongoose.models.ShalOutreachSent || mongoose.model('ShalOutreachSent', SentSchema)
export const ShalOutreachStop =
  mongoose.models.ShalOutreachStop || mongoose.model('ShalOutreachStop', StopSchema)
export const ShalOutreachEvent =
  mongoose.models.ShalOutreachEvent || mongoose.model('ShalOutreachEvent', EventSchema)
export const ShalOutreachRemoved =
  mongoose.models.ShalOutreachRemoved || mongoose.model('ShalOutreachRemoved', RemovedSchema)
export const ShalOutreachLock =
  mongoose.models.ShalOutreachLock || mongoose.model('ShalOutreachLock', LockSchema)
