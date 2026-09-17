import { redirect } from 'next/navigation'

/** Scripture lives with Tags — keep this URL for old bookmarks. */
export default function AdminScriptureRedirect() {
  redirect('/dashboard/tags')
}
