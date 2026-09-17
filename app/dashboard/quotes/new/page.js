import { redirect } from 'next/navigation'

/** New quote lives on Manage — keep this URL for old bookmarks. */
export default function NewQuoteRedirect() {
  redirect('/dashboard/quotes')
}
