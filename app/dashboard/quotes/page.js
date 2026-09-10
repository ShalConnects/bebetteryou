import { requireAdminPage } from '@/libs/dashboard-auth'
import { readQuotes } from '@/libs/quotes-store'
import { readTags, tagNames } from '@/libs/tags-store'
import QuoteManager from '@/components/dashboard/QuoteManager'
import { PageIntro } from '@/components/site/ui'

export const metadata = { title: 'Manage quotes' }

export default async function AdminQuotesPage() {
  await requireAdminPage()
  const [quotes, tags] = await Promise.all([readQuotes(), readTags()])

  return (
    <div className="space-y-8">
      <PageIntro title="Manage quotes">Search, edit, regenerate, or delete cards.</PageIntro>
      <QuoteManager quotes={quotes} tagOptions={tagNames(tags)} />
    </div>
  )
}
