import { NextResponse } from 'next/server'
import { appConfig } from '@/config/app'
import { handleApiError } from '@/libs/api'
import { guard } from '@/libs/api-guard'
import { withApiLogging } from '@/libs/api-middleware'
import { submitOrderToPrintful } from '@/libs/print-fulfillment'
import { rateLimitPresets } from '@/libs/rate-limit'
import { printFulfillSchema } from '@/libs/validation-schemas'

/**
 * @swagger
 * /api/print/fulfill:
 *   post:
 *     summary: Retry handing a paid order to Printful (admin)
 *     tags: [Print]
 *     security:
 *       - bearerAuth: []
 */
async function handlePost(request) {
  try {
    const checked = await guard(request, {
      schema: printFulfillSchema,
      preset: rateLimitPresets.strict,
      admin: true,
      enabled: appConfig.features.enablePrintShop,
    })
    if (checked instanceof NextResponse) return checked

    const result = await submitOrderToPrintful(checked.data.orderNumber)
    return NextResponse.json(result, { status: result.ok ? 200 : 400 })
  } catch (error) {
    return handleApiError(error)
  }
}

export const POST = withApiLogging(handlePost)
