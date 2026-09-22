import { NextResponse } from 'next/server'
import { requireAdmin } from '@/libs/auth-helpers'
import { handleApiError } from '@/libs/api'
import { withApiLogging } from '@/libs/api-middleware'
import { listNewsletterSubscribersPage } from '@/libs/newsletter'

function parsePage(value) {
  const n = Number.parseInt(String(value || '1'), 10)
  return Number.isFinite(n) && n > 0 ? n : 1
}

function parseStatus(value) {
  const s = String(value || 'all')
  return s === 'active' || s === 'unsubscribed' ? s : 'all'
}

function parsePageSize(value) {
  const n = Number.parseInt(String(value || '50'), 10)
  if (!Number.isFinite(n)) return 50
  return Math.min(Math.max(n, 10), 200)
}

async function handleGet(request) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const { searchParams } = new URL(request.url)
    const paged = await listNewsletterSubscribersPage({
      page: parsePage(searchParams.get('page')),
      pageSize: parsePageSize(searchParams.get('pageSize')),
      status: parseStatus(searchParams.get('status')),
    })

    return NextResponse.json({
      success: true,
      subscribers: paged.rows.map((row) => ({
        email: row.email,
        prefs: row.prefs || { quotes: false, blog: false, books: false },
        unsubscribedAt: row.unsubscribedAt ? String(row.unsubscribedAt) : null,
        createdAt: row.createdAt ? String(row.createdAt) : null,
      })),
      page: paged.page,
      pageSize: paged.pageSize,
      totalPages: paged.totalPages,
      filteredTotal: paged.filteredTotal,
      status: paged.status,
      activeCount: paged.activeCount,
      unsubscribedCount: paged.unsubscribedCount,
      totalCount: paged.totalCount,
    })
  } catch (error) {
    const errorResponse = handleApiError(error)
    if (errorResponse) return errorResponse
    return NextResponse.json({ error: 'Failed to list subscribers' }, { status: 500 })
  }
}

export const GET = withApiLogging(handleGet)
