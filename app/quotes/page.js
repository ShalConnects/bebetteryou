import CatalogFilters from '@/components/site/CatalogFilters'
import { Page, PageIntro, Pager, QuoteGrid } from '@/components/site/ui'
import { pageQuotes, param, quoteTags, resolveSeed, resolveSort } from '@/libs/content'
import { formatTag, quotesHref, quotesListTitle } from '@/libs/quotes-url'
import { pageRange } from '@/libs/paging'
import { getUrl } from '@/config/app'
import { quotesIntro } from '@/config/quotes'
import { buildMetadata } from '@/libs/seo'

export async function generateMetadata({ searchParams }) {
  const sp = await searchParams
  const tag = param(sp?.tag)
  const sort = resolveSort(sp?.sort)
  const { page, total, pageSize } = await pageQuotes(tag, param(sp?.page), sort, resolveSeed(sort, sp?.seed))
  const range = pageRange(page, pageSize, total)
  const url = getUrl(quotesHref({ tag, page, sort }))
  return {
    ...buildMetadata({
      title: quotesListTitle({ tag, page, sort }),
      description: range ? `${quotesIntro} Cards ${range.start}–${range.end} of ${range.total}.` : quotesIntro,
      url,
    }),
    alternates: { canonical: url },
  }
}

export default async function QuotesPage({ searchParams }) {
  const sp = await searchParams
  const tag = param(sp?.tag)
  const sort = resolveSort(sp?.sort)
  const seed = resolveSeed(sort, sp?.seed)
  const [{ items, page, pages, total, pageSize }, tags] = await Promise.all([
    pageQuotes(tag, param(sp?.page), sort, seed),
    quoteTags(),
  ])
  return (
    <Page>
      <PageIntro
        title={tag ? formatTag(tag) : undefined}
        srTitle="Quotes"
        aside={<CatalogFilters hrefFor={quotesHref} tag={tag} sort={sort} seed={seed} tags={tags} />}
      >
        {quotesIntro}
      </PageIntro>
      <QuoteGrid items={items} priorityCount={3} />
      <Pager
        page={page}
        pages={pages}
        total={total}
        pageSize={pageSize}
        href={(p) => quotesHref({ tag, page: p, sort, seed })}
      />
    </Page>
  )
}
