import { notFound } from 'next/navigation'
import PracticeSaved from '@/components/practice/PracticeSaved'
import { Page, PageIntro } from '@/components/site/ui'
import { appConfig } from '@/config/app'
import { practiceCopy } from '@/config/practice'
import { buildMetadata, noIndex } from '@/libs/seo'
import { listPracticeItems } from '@/libs/practice'

export async function generateMetadata() {
  if (!appConfig.features.enablePractice) return noIndex
  return buildMetadata({
    title: practiceCopy.savedTitle,
    description: practiceCopy.progressSub,
    url: `${appConfig.siteUrl.replace(/\/$/, '')}/practice/saved`,
  })
}

export default function PracticeSavedPage() {
  if (!appConfig.features.enablePractice) notFound()

  const itemsById = Object.fromEntries(listPracticeItems().map((item) => [item.id, item]))

  return (
    <Page narrow>
      <PageIntro title={practiceCopy.savedTitle}>{practiceCopy.progressSub}</PageIntro>
      <PracticeSaved itemsById={itemsById} />
    </Page>
  )
}
