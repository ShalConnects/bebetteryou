import { redirect } from 'next/navigation'

/** Analytics lives on Overview — keep this URL for old bookmarks. */
export default async function AdminAnalyticsRedirect({ searchParams }) {
  const { range } = (await searchParams) || {}
  redirect(range ? `/dashboard?range=${encodeURIComponent(range)}` : '/dashboard')
}
