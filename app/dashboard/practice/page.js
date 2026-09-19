import { DashPanel } from '@/components/dashboard/ui'
import { PageIntro } from '@/components/site/ui'
import { appConfig } from '@/config/app'
import { practiceCategories, practiceMonetization } from '@/config/practice'
import { requireAdminPage } from '@/libs/dashboard-auth'
import { listPracticeItems } from '@/libs/practice'
import { notFound } from 'next/navigation'

export const metadata = { title: 'Practice' }

/** Read-only catalog — edit `data/practice/items.json` until write CRUD is needed. */
export default async function DashboardPracticePage() {
  await requireAdminPage()
  if (!appConfig.features.enablePractice) notFound()

  const items = listPracticeItems()
  const byCategory = practiceCategories.map((category) => ({
    category,
    count: items.filter((item) => item.category === category).length,
  }))

  return (
    <>
      <PageIntro title="Practice">Catalog and monetization hooks (read-only).</PageIntro>

      <div className="space-y-6">
        <DashPanel title="Practice catalog">
          <p className="text-sm text-body/75">
            {items.length} items in <code className="text-quiet">data/practice/items.json</code>. Core reset
            paywalled: {String(practiceMonetization.resetPaywalled)}.
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {byCategory
              .filter((row) => row.count)
              .map((row) => (
                <li key={row.category} className="tag">
                  {row.category} · {row.count}
                </li>
              ))}
          </ul>
        </DashPanel>

        <DashPanel title="Items">
          <ul className="divide-y divide-line">
            {items.map((item) => (
              <li key={item.id} className="py-4 first:pt-0 last:pb-0">
                <p className="text-paper">
                  <span className="text-quiet">{item.id}</span>
                  <span className="mx-2 text-quiet">·</span>
                  {item.title || item.thought}
                </p>
                <p className="mt-1 text-sm text-body/70">
                  {item.category}
                  {item.reset ? ' · reset pool' : ''}
                  {item.estimatedMinutes ? ` · ~${item.estimatedMinutes}m` : ''}
                </p>
              </li>
            ))}
          </ul>
        </DashPanel>

        <DashPanel title="Monetization hooks">
          <ul className="grid gap-2 text-sm text-body/75 sm:grid-cols-2">
            {Object.entries(practiceMonetization).map(([key, value]) => (
              <li key={key}>
                {key}: <span className="text-quiet">{String(value)}</span>
              </li>
            ))}
          </ul>
        </DashPanel>
      </div>
    </>
  )
}
