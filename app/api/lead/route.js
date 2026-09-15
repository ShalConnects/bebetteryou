import { NextResponse } from 'next/server'
import { connectDB } from '@/libs/mongo'
import Lead from '@/models/Lead'
import { requireAdmin } from '@/libs/auth-helpers'
import { handleApiError } from '@/libs/api'
import { rateLimit, rateLimitPresets } from '@/libs/rate-limit'
import {
  createLeadSchema,
  newsletterSignupSchema,
  validateSchema,
} from '@/libs/validation-schemas'
import { withApiLogging } from '@/libs/api-middleware'
import {
  listNewsletterSubscribers,
  sendWelcomeIfNeeded,
  upsertNewsletterSubscriber,
} from '@/libs/newsletter'
import { logError } from '@/libs/logger'
import { sendLeadNotification } from '@/libs/resend'

/**
 * @swagger
 * /api/lead:
 *   post:
 *     summary: Create a lead or newsletter signup (email + optional prefs)
 *     tags: [Leads]
 *     security: []
 *   get:
 *     summary: List leads or newsletter subscribers (admin only)
 *     tags: [Leads]
 */
async function handlePost(request) {
  try {
    const rateLimitResult = await rateLimit(
      request,
      rateLimitPresets.moderate.limit,
      rateLimitPresets.moderate.windowMs
    )
    if (rateLimitResult) return rateLimitResult

    await connectDB()
    const body = await request.json()
    const newsletter = body?.name == null && body?.message == null
    const validation = validateSchema(newsletter ? newsletterSignupSchema : createLeadSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.message, details: validation.error.details },
        { status: 400 }
      )
    }

    if (newsletter) {
      const { lead, created } = await upsertNewsletterSubscriber({
        email: validation.data.email,
        prefs: validation.data.prefs,
      })
      try {
        await sendWelcomeIfNeeded(lead)
      } catch (error) {
        logError('Newsletter welcome failed', error, { email: lead.email })
      }
      return NextResponse.json({ success: true, created })
    }

    const { name, email, message } = validation.data
    const lead = await Lead.create({ name, email, message })
    try {
      await sendLeadNotification(lead)
    } catch (error) {
      logError('Lead notification failed', error)
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error?.code === 11000) return NextResponse.json({ success: true })
    const errorResponse = handleApiError(error)
    if (errorResponse) return errorResponse
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 })
  }
}

export const POST = withApiLogging(handlePost)

async function handleGet(request) {
  try {
    const authResult = await requireAdmin()
    if (authResult instanceof NextResponse) return authResult

    const url = new URL(request.url)
    const source = url.searchParams.get('source')

    if (source === 'newsletter') {
      const subscribers = await listNewsletterSubscribers()
      return NextResponse.json({ subscribers })
    }

    await connectDB()
    const leads = await Lead.find().sort({ createdAt: -1 })
    return NextResponse.json({ leads })
  } catch (error) {
    const errorResponse = handleApiError(error)
    if (errorResponse) return errorResponse
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
  }
}

export const GET = withApiLogging(handleGet)
