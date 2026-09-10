import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/libs/next-auth'
import { isAdminSession } from '@/libs/auth-helpers'
import DashboardShell from '@/components/dashboard/Shell'

export default async function DashboardLayout({ children }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/signin')

  return <DashboardShell isAdmin={isAdminSession(session)}>{children}</DashboardShell>
}
