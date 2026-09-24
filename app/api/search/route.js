import { NextResponse } from 'next/server'
import { handleApiError } from '@/libs/api'
import { withApiLogging } from '@/libs/api-middleware'
import { guard } from '@/libs/api-guard'
import { rateLimitPresets } from '@/libs/rate-limit'
import { SEARCH_PREVIEW_LIMIT, normalizeQuery, searchSite } from '@/libs/search'

async function handleGet(request) {
  try {
    const gated = await guard(request, { preset: rateLimitPresets.lenient })
    if (gated instanceof NextResponse) return gated

    const q = normalizeQuery(new URL(request.url).searchParams.get('q'))
    const result = await searchSite(q, { limit: SEARCH_PREVIEW_LIMIT })
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    return handleApiError(error)
  }
}

export const GET = withApiLogging(handleGet)
