import { requireAdminPage } from '@/libs/dashboard-auth'
import { listTagsWithUsage } from '@/libs/manage-tag'
import TagManager from '@/components/dashboard/TagManager'
import { PageIntro } from '@/components/site/ui'

export const metadata = { title: 'Manage tags' }

export default async function AdminTagsPage() {
  await requireAdminPage()
  const tags = await listTagsWithUsage()

  return (
    <div className="space-y-8">
      <PageIntro title="Manage tags">Add, edit, or delete tags. Mood labels power Surprise on the site.</PageIntro>
      <TagManager tags={tags} />
    </div>
  )
}
