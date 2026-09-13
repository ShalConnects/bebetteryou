import { requireAdminPage } from '@/libs/dashboard-auth'
import { scriptureThemeOptions } from '@/libs/manage-scripture'
import { nextQuoteN, readQuotes } from '@/libs/quotes-store'
import { readTags, tagNames } from '@/libs/tags-store'
import QuoteForm from '@/components/site/QuoteForm'
import { PageIntro } from '@/components/site/ui'

export const metadata = { title: 'New quote' }

export default async function NewQuotePage() {
  await requireAdminPage()
  const [quotes, tags, themeOptions] = await Promise.all([
    readQuotes(),
    readTags(),
    scriptureThemeOptions(),
  ])

  return (
    <div className="space-y-8">
      <PageIntro title="New quote">Generate a card and publish it.</PageIntro>
      <QuoteForm
        nextN={nextQuoteN(quotes)}
        tagOptions={tagNames(tags)}
        themeOptions={themeOptions}
        catalog={quotes.filter((q) => q.text).map(({ n, slug, text }) => ({ n, slug, text }))}
      />
    </div>
  )
}
