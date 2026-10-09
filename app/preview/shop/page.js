import { notFound } from 'next/navigation'
import Chips, { moodLinks } from '@/components/preview/Chips'
import SectionHead from '@/components/preview/SectionHead'
import ShopGrid from '@/components/preview/ShopGrid'
import PrintOwnForm from '@/components/site/PrintOwnForm'
import { Page, Pager } from '@/components/site/ui'
import { appConfig } from '@/config/app'
import { previewCopy as c, pv } from '@/config/preview'
import { listMoodIntents, pagePrintableQuotes, param, printableQuoteTags } from '@/libs/content'
import { shopHref } from '@/libs/quotes-url'

export default async function PreviewShop({ searchParams }) {
  if (!appConfig.features.enablePrintShop) notFound()
  const sp = await searchParams
  const tag = param(sp?.tag)
  const [{ items, page, pages, total, pageSize }, tags, moods] = await Promise.all([
    pagePrintableQuotes(tag, param(sp?.page)),
    printableQuoteTags(),
    listMoodIntents(),
  ])
  const href = (t, p) => pv(shopHref({ tag: t, page: p }))

  return (
    <Page>
      <SectionHead as="h1" title={c.shopTitle} sub={c.wearSub} />
      <PrintOwnForm className="pv-tile mb-12">
        <h2 className="heading-sm">{c.ownTitle}</h2>
        <p className="text-sm text-body/75">{c.ownSub}</p>
      </PrintOwnForm>
      <Chips label="Moods" className="mb-6" items={moodLinks(moods, tags, tag, (t) => href(t))} />
      <ShopGrid items={items} />
      <Pager page={page} pages={pages} total={total} pageSize={pageSize} href={(p) => href(tag, p)} />
    </Page>
  )
}
