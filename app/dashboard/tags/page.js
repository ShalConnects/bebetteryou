import { requireAdminPage } from '@/libs/dashboard-auth'
import { listTagsWithUsage } from '@/libs/manage-tag'
import { listScriptureEntries, scriptureThemeOptions } from '@/libs/manage-scripture'
import { asList, readQuotes } from '@/libs/quotes-store'
import TagManager from '@/components/dashboard/TagManager'
import ScriptureManager from '@/components/dashboard/ScriptureManager'
import { DashPage, DashPanel } from '@/components/dashboard/ui'
import { settingsTabs } from '@/config/dashboard'

export const metadata = { title: 'Settings' }

const tabs = {
  tags: async () => (
    <DashPanel description="Mood labels and content lanes for Surprise, quotes, blog, and social.">
      <TagManager tags={await listTagsWithUsage()} />
    </DashPanel>
  ),
  async scripture() {
    const [entries, quotes, themeOptions] = await Promise.all([
      listScriptureEntries(),
      readQuotes().then((q) => asList(q).map(({ n, slug, tags, theme }) => ({ n, slug, tags, theme }))),
      scriptureThemeOptions(),
    ])
    return (
      <DashPanel description="Passages shown under a card, by the reader's tradition and the card's tag theme.">
        <ScriptureManager entries={entries} quotes={quotes} themeOptions={themeOptions} />
      </DashPanel>
    )
  },
}

export default async function AdminTagsPage({ searchParams }) {
  await requireAdminPage()
  const { section } = (await searchParams) || {}
  const active = section === 'scripture' ? 'scripture' : 'tags'

  return (
    <DashPage title="Settings" description="Content lanes for quotes, blog and social, plus tradition passages." tabs={settingsTabs} active={active}>
      {await tabs[active]()}
    </DashPage>
  )
}
