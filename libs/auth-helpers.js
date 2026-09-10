import { getServerSession } from 'next-auth'
import { authOptions } from './next-auth'
import { NextResponse } from 'next/server'
import { logError } from './logger'
import { isAdminUser, isOwnerEmail } from '@/config/admin-auth'

export function isAdminEmail(email) {
  return isOwnerEmail(email)
}

export function isAdminSession(session) {
  return isAdminUser(session?.user)
}

export async function getAuthSession() {
  try {
    return await getServerSession(authOptions)
  } catch (error) {
    logError('Auth session error', error)
    return null
  }
}

export async function requireAuth() {
  const session = await getAuthSession()
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Authentication required' },
      { status: 401 }
    )
  }
  return { session }
}

/** Admin only. Returns { session } or 401/403 Response. */
export async function requireAdmin() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  if (!isAdminSession(auth.session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return auth
}
