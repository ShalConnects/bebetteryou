import { redirect } from 'next/navigation'
import { getAuthSession, isAdminSession } from './auth-helpers'

export async function requireAdminPage() {
  const session = await getAuthSession()
  if (!session) redirect('/auth/signin')
  if (!isAdminSession(session)) redirect('/dashboard')
  return session
}
