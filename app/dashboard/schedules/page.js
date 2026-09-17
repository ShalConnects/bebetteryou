import { redirect } from 'next/navigation'

/** Schedules live on Manage quotes — keep this URL for old bookmarks. */
export default function AdminSchedulesRedirect() {
  redirect('/dashboard/quotes')
}
