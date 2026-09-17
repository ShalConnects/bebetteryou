import { requireAdminPage } from '@/libs/dashboard-auth'
import { listTagsWithUsage } from '@/libs/manage-tag'
import { listScriptureEntries, scriptureGaps, scriptureThemeOptions } from '@/libs/manage-scripture'
import { asList, readQuotes } from '@/libs/quotes-store'
import TagManager from '@/components/dashboard/TagManager'
import ScriptureManager from '@/components/dashboard/ScriptureManager'
import { DashSection } from '@/components/dashboard/ui'
import { PageIntro } from '@/components/site/ui'

export const metadata = { title: 'Tags & scripture' }

export default async function AdminTagsPage() {
  await requireAdminPage()
  const [tags, entries, gaps, quotes, themeOptions] = await Promise.all([
    listTagsWithUsage(),
    listScriptureEntries(),
    scriptureGaps(),
    readQuotes().then((q) => asList(q).map(({ n, slug, tags, theme }) => ({ n, slug, tags, theme }))),
    scriptureThemeOptions(),
  ])

  return (
    <div className="space-y-12">
      <PageIntro title="Tags & scripture">
        Content lanes for quotes, blog, and social — plus tradition passages keyed to those tag themes.
      </PageIntro>

      <DashSection title="Tags" description="Mood labels and content lanes for Surprise, quotes, blog, and social.">
        <TagManager tags={tags} />
      </DashSection>

      <DashSection
        title="Scripture"
        description="Tradition passages and reflections keyed to tag themes."
        defaultOpen={false}
      >
        <ScriptureManager entries={entries} gaps={gaps} quotes={quotes} themeOptions={themeOptions} />
      </DashSection>
    </div>
  )
}
