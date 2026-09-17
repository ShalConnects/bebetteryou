import { NextResponse } from 'next/server'
import { requireAdmin } from '@/libs/auth-helpers'
import { handleApiError } from '@/libs/api'
import { withApiLogging } from '@/libs/api-middleware'
import {
  NEWSLETTER_IMPORT_MAX,
  importNewsletterSubscribers,
  parseNewsletterImportCsv,
} from '@/libs/newsletter'
import { newsletterImportSchema, validateSchema } from '@/libs/validation-schemas'

async function handlePost(request) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const body = await request.json().catch(() => null)
    const validation = validateSchema(newsletterImportSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.message, details: validation.error.details },
        { status: 400 }
      )
    }

    const { rows, invalid } = parseNewsletterImportCsv(validation.data.csv)
    if (!rows.length) {
      return NextResponse.json(
        {
          error: 'No valid emails found',
          invalid: invalid.slice(0, 20),
          invalidCount: invalid.length,
        },
        { status: 400 }
      )
    }
    if (rows.length > NEWSLETTER_IMPORT_MAX) {
      return NextResponse.json(
        { error: `Import limited to ${NEWSLETTER_IMPORT_MAX} emails per upload` },
        { status: 400 }
      )
    }

    const result = await importNewsletterSubscribers(rows)
    return NextResponse.json({
      success: true,
      ...result,
      invalidCount: invalid.length,
      invalidSample: invalid.slice(0, 10),
    })
  } catch (error) {
    const errorResponse = handleApiError(error)
    if (errorResponse) return errorResponse
    return NextResponse.json({ error: 'Failed to import subscribers' }, { status: 500 })
  }
}

export const POST = withApiLogging(handlePost)
