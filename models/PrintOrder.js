import mongoose from 'mongoose'
import { timestampsPlugin } from './plugins'
import { printOrderStatuses } from '@/libs/print-status'

const ShippingSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    address1: { type: String, required: true },
    address2: { type: String, default: '' },
    city: { type: String, required: true },
    state: { type: String, default: '' },
    zip: { type: String, required: true },
    country: { type: String, required: true },
  },
  { _id: false }
)

const PrintOrderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true, index: true },
  quoteSlug: { type: String, required: true },
  productId: { type: String, required: true },
  variantId: { type: Number, default: null },
  color: { type: String, required: true },
  size: { type: String, required: true },
  /** Resolved presets, so support can see what was actually set. */
  style: { type: String, default: '' },
  leading: { type: String, default: '' },
  scale: { type: String, default: '' },
  credit: { type: String, default: '' },
  /** Printful placement id — which side of the garment it prints on. */
  placement: { type: String, default: '' },
  quantity: { type: Number, default: 1, min: 1 },
  printFileUrl: { type: String, required: true },
  /** Money in cents so nothing depends on float arithmetic. */
  retailPrice: { type: Number, required: true },
  shippingPrice: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  currency: { type: String, default: 'USD' },
  customer: { type: ShippingSchema, required: true },
  status: { type: String, enum: printOrderStatuses, default: 'draft', index: true },
  printfulOrderId: { type: String, default: null },
  paymentProvider: { type: String, default: 'none' },
  paymentRef: { type: String, default: null, index: true },
  failureReason: { type: String, default: null },
})

PrintOrderSchema.plugin(timestampsPlugin)

export default mongoose.models.PrintOrder || mongoose.model('PrintOrder', PrintOrderSchema)
