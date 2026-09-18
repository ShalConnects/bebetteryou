import { notFound } from 'next/navigation'
import PracticeHome from '@/components/practice/PracticeHome'
import { Page, PageIntro } from '@/components/site/ui'
import { appConfig } from '@/config/app'
import { practiceCopy, practiceIntents } from '@/config/practice'
import { buildMetadata, noIndex } from '@/libs/seo'
import { getPracticeItem, itemForIntent, todayReset } from '@/libs/practice'

export async function generateMetadata() {
  if (!appConfig.features.enablePractice) return noIndex
  return buildMetadata({
    title: practiceCopy.homeTitle,
    description: practiceCopy.homeSub,
    url: `${appConfig.siteUrl.replace(/\/$/, '')}/practice`,
  })
}

export default async function PracticePage({ searchParams }) {
  if (!appConfig.features.enablePractice) notFound()

  const params = await searchParams
  const pinned = params?.item ? getPracticeItem(params.item) : null
  const resetItem = pinned || todayReset()
  const intentItems = Object.fromEntries(
    practiceIntents.map((intent) => [intent.id, itemForIntent(intent.id)])
  )

  return (
    <Page narrow>
      <PageIntro title={practiceCopy.homeTitle}>{practiceCopy.homeSub}</PageIntro>
      <PracticeHome resetItem={resetItem} intentItems={intentItems} />
    </Page>
  )
}
