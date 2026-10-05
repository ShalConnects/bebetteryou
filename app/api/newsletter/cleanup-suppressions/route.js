import { NextResponse } from 'next/server'
import { requireAdmin } from '@/libs/auth-helpers'
import { handleApiError } from '@/libs/api'
import { withApiLogging } from '@/libs/api-middleware'
import { cleanupSuppressedNewsletterSubscribers } from '@/libs/newsletter-cleanup'

async function handlePost() {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const result = await cleanupSuppressedNewsletterSubscribers()
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    const errorResponse = handleApiError(error)
    if (errorResponse) return errorResponse
    return NextResponse.json(
      { error: error.message || 'Failed to clean up suppressions' },
      { status: 500 }
    )
  }
}

export const POST = withApiLogging(handlePost)
