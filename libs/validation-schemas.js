import { z } from 'zod'
import { analyticsEventNames } from '@/config/analytics'
import { quoteCard } from '@/config/quote-card'

/** Shared email field — trim/normalize before format check */
const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Email is required')
  .max(255, 'Email must be less than 255 characters')
  .email('Invalid email format')

export const emailOnlySchema = z.object({ email: emailField })

export const createLeadSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  email: emailField,
  message: z
    .string()
    .trim()
    .min(1, 'Message is required')
    .max(5000, 'Message must be less than 5000 characters'),
})

export const createCheckoutSessionSchema = z.object({
  priceId: z
    .string()
    .trim()
    .min(1, 'Price ID is required')
    .regex(/^price_[a-zA-Z0-9]+$/, 'Invalid Stripe price ID format'),
})

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: emailField,
  password: z.string().min(8, 'Password must be 8+ characters'),
})

export const magicLinkSchema = emailOnlySchema

/** Print shop — the catalog validates product/color/size, so these only bound shape. */
const printSelection = {
  slug: z.string().trim().min(1, 'Quote is required').max(200),
  productId: z.string().trim().min(1, 'Product is required').max(40),
  color: z.string().trim().min(1, 'Color is required').max(40),
  /** Preset ids; the catalog resolves them and falls back, so shape is enough. */
  style: z.string().trim().max(20).optional(),
  leading: z.string().trim().max(20).optional(),
  scale: z.string().trim().max(20).optional(),
  credit: z.string().trim().max(20).optional(),
  placement: z.string().trim().max(40).optional(),
  /** Only used when slug is `own`; catalog slugs ignore these. */
  text: z.string().max(quoteCard.quote.maxChars).optional(),
  author: z.string().trim().max(80).optional(),
}

/** Size is optional here but changes mug artwork, so the preview passes it. */
export const printDesignSchema = z.object({
  ...printSelection,
  size: z.string().trim().max(20).optional(),
})

export const printAddressSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: emailField,
  address1: z.string().trim().min(1, 'Address is required').max(200),
  address2: z.string().trim().max(200).default(''),
  city: z.string().trim().min(1, 'City is required').max(100),
  state: z.string().trim().max(100).default(''),
  zip: z.string().trim().min(1, 'Postal code is required').max(20),
  country: z.string().trim().toUpperCase().length(2, 'Use a 2-letter country code'),
})

export const printQuoteSchema = z.object({
  ...printSelection,
  size: z.string().trim().min(1, 'Size is required').max(20),
  quantity: z.coerce.number().int().min(1).max(10).default(1),
  address: printAddressSchema,
})

export const printCheckoutSchema = printQuoteSchema

export const printFulfillSchema = z.object({
  orderNumber: z.string().trim().min(1, 'Order number is required').max(60),
})

export const printPaidSchema = printFulfillSchema

/**
 * Analytics ingest. Every field is bounded and optional so a malformed beacon
 * degrades to a bare pageview instead of a 400 nobody will ever see — the
 * browser sends these with `sendBeacon` and never reads the response.
 */
export const trackEventSchema = z.object({
  name: z.enum(analyticsEventNames),
  path: z.string().trim().max(300).default('/'),
  slug: z.string().trim().max(200).default(''),
  target: z.string().trim().max(40).default(''),
  referrer: z.string().trim().max(500).default(''),
  source: z.string().trim().max(100).default(''),
  medium: z.string().trim().max(100).default(''),
  campaign: z.string().trim().max(100).default(''),
})

export function validateSchema(schema, data) {
  try {
    return { success: true, data: schema.parse(data) }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: {
          message: 'Validation Error',
          details: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
      }
    }
    return {
      success: false,
      error: { message: 'Validation Error', details: [{ message: 'Invalid request data' }] },
    }
  }
}
