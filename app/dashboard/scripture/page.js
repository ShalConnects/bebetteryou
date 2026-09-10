import { requireAdminPage } from '@/libs/dashboard-auth'
import { listScriptureEntries, scriptureGaps, scriptureThemeOptions } from '@/libs/manage-scripture'
import { asList, readQuotes } from '@/libs/quotes-store'
import ScriptureManager from '@/components/dashboard/ScriptureManager'
import { PageIntro } from '@/components/site/ui'

export const metadata = { title: 'Manage scripture' }

export default async function AdminScripturePage() {
  await requireAdminPage()
  const [entries, gaps, quotes, themeOptions] = await Promise.all([
    listScriptureEntries(),
    scriptureGaps(),
    readQuotes().then((q) => asList(q).map(({ n, slug, tags, theme }) => ({ n, slug, tags, theme }))),
    scriptureThemeOptions(),
  ])

  return (
    <div className="space-y-8">
      <PageIntro title="Tradition passages">
        Curate scripture and reflections per tradition and quote tag theme.
      </PageIntro>
      <ScriptureManager entries={entries} gaps={gaps} quotes={quotes} themeOptions={themeOptions} />
    </div>
  )
}