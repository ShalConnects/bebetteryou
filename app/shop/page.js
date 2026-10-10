import CatalogFilters from '@/components/site/CatalogFilters'
import PrintOwnForm from '@/components/site/PrintOwnForm'
import ShopGrid from '@/components/site/ShopGrid'
import { Page, PageIntro, Pager } from '@/components/site/ui'
import { appConfig, getUrl } from '@/config/app'
import { copy, shop } from '@/config/site'
import { pagePrintableQuotes, param, printableQuoteTags, resolveSeed, resolveSort } from '@/libs/content'
import { formatTag, shopHref } from '@/libs/quotes-url'
import { pageRange } from '@/libs/paging'
import { buildMetadata } from '@/libs/seo'

const printLive = appConfig.features.enablePrintShop
const shopIntro = 'Tee or mug, printed when you order.'

export async function generateMetadata({ searchParams }) {
  if (!printLive) {
    return buildMetadata({
      title: 'Shop',
      description: shop.url
        ? 'Tees and mugs carrying the quotes. Printed and shipped when you order.'
        : 'Tees and mugs carrying the quotes — opening soon.',
    })
  }

  const sp = await searchParams
  const tag = param(sp?.tag)
  const sort = resolveSort(sp?.sort)
  const { page, total, pageSize } = await pagePrintableQuotes(tag, param(sp?.page), sort, resolveSeed(sort, sp?.seed))
  const range = pageRange(page, pageSize, total)
  const url = getUrl(shopHref({ tag, page, sort }))
  return {
    ...buildMetadata({
      title: tag ? `${formatTag(tag)} — Shop` : 'Shop',
      description: range ? `${shopIntro} ${range.start}–${range.end} of ${range.total}.` : shopIntro,
      url,
    }),
    alternates: { canonical: url },
  }
}

export default async function Shop({ searchParams }) {
  if (printLive) {
    const sp = await searchParams
    const tag = param(sp?.tag)
    const sort = resolveSort(sp?.sort)
    const seed = resolveSeed(sort, sp?.seed)
    const [{ items, page, pages, total, pageSize }, tags] = await Promise.all([
      pagePrintableQuotes(tag, param(sp?.page), sort, seed),
      printableQuoteTags(),
    ])

    return (
      <Page>
        <PageIntro
          srTitle={tag ? formatTag(tag) : 'Shop'}
          aside={<CatalogFilters hrefFor={shopHref} tag={tag} sort={sort} seed={seed} tags={tags} />}
        >
          {shopIntro}
        </PageIntro>
        <PrintOwnForm className="tile mb-12 hover:translate-y-0">
          <h2 className="heading-sm">{copy.shopOwnTitle}</h2>
          <p className="text-sm text-body/75">{copy.shopOwnSub}</p>
        </PrintOwnForm>
        {items.length ? <ShopGrid items={items} /> : <p className="text-center text-quiet">No quotes yet.</p>}
        <Pager
          page={page}
          pages={pages}
          total={total}
          pageSize={pageSize}
          href={(p) => shopHref({ tag, page: p, sort, seed })}
        />
      </Page>
    )
  }

  if (!shop.url) {
    return (
      <Page>
        <PageIntro title="Tees and mugs with the quotes — later." />
        <p className="text-quiet">Not open yet.</p>
      </Page>
    )
  }

  return (
    <Page>
      <PageIntro title="Wear the reminder.">
        Tees and mugs carrying the quotes. Printed and shipped when you order, so nothing sits in a warehouse.
      </PageIntro>
      <p>
        <a className="btn" href={shop.url} target="_blank" rel="noopener noreferrer">
          Open the store
        </a>
      </p>
      <p className="mt-6 text-sm text-quiet">
        {shop.provider
          ? `Checkout, shipping, and returns are handled by ${shop.provider}.`
          : 'Checkout and shipping are handled by our store partner.'}
      </p>
    </Page>
  )
}
