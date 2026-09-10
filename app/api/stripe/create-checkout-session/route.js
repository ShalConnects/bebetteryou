import { NextResponse } from 'next/server'
import { stripe, createCustomer } from '@/libs/stripe'
import { requireAuth } from '@/libs/auth-helpers'
import { handleApiError } from '@/libs/api'
import { createCheckoutSessionSchema, validateSchema } from '@/libs/validation-schemas'
import { withApiLogging } from '@/libs/api-middleware'
import { connectDB } from '@/libs/mongo'
import User from '@/models/User'

/**
 * @swagger
 * /api/stripe/create-checkout-session:
 *   post:
 *     summary: Create a Stripe checkout session
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - priceId
 *             properties:
 *               priceId:
 *                 type: string
 *                 pattern: '^price_[a-zA-Z0-9]+$'
 *                 example: price_1234567890abcdef
 *     responses:
 *       200:
 *         description: Checkout session created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sessionId:
 *                   type: string
 *                   example: cs_test_1234567890
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
async function handlePost(request) {
  try {
    // Require authentication
    const authResult = await requireAuth()
    if (authResult instanceof NextResponse) {
      return authResult
    }
    
    const { session } = authResult
    const userId = session.user?.id
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found in session' },
        { status: 400 }
      )
    }
    
    const body = await request.json()
    
    // Validate request body with Zod schema
    const validation = validateSchema(createCheckoutSessionSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: validation.error.message,
          details: validation.error.details
        },
        { status: 400 }
      )
    }
    
    // Use validated data from schema
    const { priceId } = validation.data
    
    // Get or create Stripe customer
    await connectDB()
    let user = await User.findById(userId)
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    let customerId = user.stripeCustomerId
    
    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await createCustomer(user.email, user.name)
      customerId = customer.id
      
      // Update user with Stripe customer ID
      user = await User.findByIdAndUpdate(
        userId,
        { stripeCustomerId: customerId },
        { new: true }
      )
    }
    
    const { getUrl } = await import('@/config/app')
    const appConfig = (await import('@/config/app')).appConfig
    
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${getUrl(appConfig.dashboardUrl)}?success=true`,
      cancel_url: `${getUrl(appConfig.pricingUrl)}?canceled=true`,
      metadata: {
        userId: userId,
      },
    })
    
    return NextResponse.json({ sessionId: checkoutSession.id })
  } catch (error) {
    const errorResponse = handleApiError(error)
    if (errorResponse) return errorResponse
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}

export const POST = withApiLogging(handlePost, { logRequestBody: false, logResponseBody: false })
