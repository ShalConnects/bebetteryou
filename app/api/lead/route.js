import { NextResponse } from 'next/server'
import { connectDB } from '@/libs/mongo'
import Lead from '@/models/Lead'
import { requireAdmin } from '@/libs/auth-helpers'
import { handleApiError } from '@/libs/api'
import { rateLimit, rateLimitPresets } from '@/libs/rate-limit'
import { createLeadSchema, emailOnlySchema, validateSchema } from '@/libs/validation-schemas'
import { withApiLogging } from '@/libs/api-middleware'

/**
 * @swagger
 * /api/lead:
 *   post:
 *     summary: Create a lead or newsletter signup (email-only)
 *     tags: [Leads]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: object
 *                 required: [email]
 *                 properties:
 *                   email: { type: string, format: email }
 *               - type: object
 *                 required: [name, email, message]
 *                 properties:
 *                   name: { type: string, minLength: 1, maxLength: 100 }
 *                   email: { type: string, format: email }
 *                   message: { type: string, minLength: 1, maxLength: 5000 }
 *     responses:
 *       200: { description: Lead created or newsletter signup recorded }
 *       400: { description: Validation error }
 *       429: { description: Rate limit exceeded }
 *   get:
 *     summary: List leads (admin only)
 *     tags: [Leads]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of leads }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
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
    const validation = validateSchema(newsletter ? emailOnlySchema : createLeadSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.message, details: validation.error.details },
        { status: 400 }
      )
    }

    if (newsletter) {
      await Lead.findOneAndUpdate(
        { email: validation.data.email, source: 'newsletter' },
        { $setOnInsert: { email: validation.data.email, source: 'newsletter' } },
        { upsert: true }
      )
    } else {
      const { name, email, message } = validation.data
      await Lead.create({ name, email, message })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    // Concurrent newsletter signup — treat as success
    if (error?.code === 11000) return NextResponse.json({ success: true })
    const errorResponse = handleApiError(error)
    if (errorResponse) return errorResponse
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 })
  }
}

export const POST = withApiLogging(handlePost)

async function handleGet() {
  try {
    const authResult = await requireAdmin()
    if (authResult instanceof NextResponse) return authResult

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
