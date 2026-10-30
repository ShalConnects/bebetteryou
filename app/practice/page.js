import { notFound } from 'next/navigation'
import PracticeHome from '@/components/practice/PracticeHome'
import JsonLd from '@/components/site/JsonLd'
import { Page, PageIntro } from '@/components/site/ui'
import { appConfig, getUrl } from '@/config/app'
import { practiceCopy, practiceDiscoverable, practiceIntents } from '@/config/practice'
import { buildMetadata, noIndex } from '@/libs/seo'
import {
  getPracticeItem,
  itemForIntent,
  practiceItemJsonLd,
  todayReset,
} from '@/libs/practice'

export async function generateMetadata({ searchParams }) {
  if (!appConfig.features.enablePractice) return noIndex
  const params = await searchParams
  const item = params?.item ? getPracticeItem(params.item) : null
  const url = getUrl(item ? `/practice?item=${encodeURIComponent(item.id)}` : '/practice')
  return buildMetadata({
    title: item?.title || practiceCopy.homeTitle,
    description: item?.thought || practiceCopy.homeSub,
    url,
    index: practiceDiscoverable, // stays out of search until the public launch
  })
}

export default async function PracticePage({ searchParams }) {
  if (!appConfig.features.enablePractice) notFound()

  const params = await searchParams
  const pinnedItem = params?.item ? getPracticeItem(params.item) : null
  const resetItem = todayReset()
  const intentItems = Object.fromEntries(
    practiceIntents.map((intent) => [intent.id, itemForIntent(intent.id)])
  )
  const jsonItem = pinnedItem || resetItem
  const url = getUrl(`/practice?item=${encodeURIComponent(jsonItem.id)}`)

  return (
    <Page narrow>
      <PageIntro title={practiceCopy.homeTitle}>{practiceCopy.homeSub}</PageIntro>
      <PracticeHome resetItem={resetItem} pinnedItem={pinnedItem} intentItems={intentItems} />
      <JsonLd data={practiceItemJsonLd(jsonItem, url)} />
    </Page>
  )
}
