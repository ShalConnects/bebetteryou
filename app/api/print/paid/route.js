import { NextResponse } from 'next/server'
import { appConfig } from '@/config/app'
import { handleApiError } from '@/libs/api'
import { guard } from '@/libs/api-guard'
import { withApiLogging } from '@/libs/api-middleware'
import { markOrderPaid } from '@/libs/print-payment'
import { rateLimitPresets } from '@/libs/rate-limit'
import { printPaidSchema } from '@/libs/validation-schemas'

/**
 * @swagger
 * /api/print/paid:
 *   post:
 *     summary: Mark a parked print order as paid (admin, `none` provider only)
 *     tags: [Print]
 *     security:
 *       - bearerAuth: []
 */
async function handlePost(request) {
  try {
    const checked = await guard(request, {
      schema: printPaidSchema,
      preset: rateLimitPresets.strict,
      admin: true,
      enabled: appConfig.features.enablePrintShop,
    })
    if (checked instanceof NextResponse) return checked

    const result = await markOrderPaid(checked.data.orderNumber)
    return NextResponse.json(result, { status: result.ok ? 200 : 400 })
  } catch (error) {
    return handleApiError(error)
  }
}

export const POST = withApiLogging(handlePost)
