import Link from 'next/link'
import CatalogFilters from '@/components/site/CatalogFilters'
import ShopQuoteThumb from '@/components/site/ShopQuoteThumb'
import { Page, PageIntro, Pager } from '@/components/site/ui'
import { appConfig, getUrl } from '@/config/app'
import { quoteCard } from '@/config/quote-card'
import { publicPrintProducts } from '@/config/print-products'
import { creditForAuthor } from '@/config/print-styles'
import { shop } from '@/config/site'
import { pagePrintableQuotes, param, printableQuoteTags, resolveSeed, resolveSort } from '@/libs/content'
import { customPrintSlug, printHref } from '@/libs/print-link'
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
  const { page, total, pageSize } = await pagePrintableQuotes(
    tag,
    param(sp?.page),
    sort,
    resolveSeed(sort, sp?.seed)
  )
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
          title={tag ? formatTag(tag) : undefined}
          srTitle="Shop"
          aside={<CatalogFilters hrefFor={shopHref} tag={tag} sort={sort} seed={seed} tags={tags} />}
        >
          {shopIntro}
        </PageIntro>
        {items.length ? (
          <ul className="divide-y divide-line">
            {items.map((quote) => (
              <li key={quote.slug} className="flex flex-col gap-4 py-8 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                <span className="flex min-w-0 items-center gap-4">
                  <ShopQuoteThumb quote={quote} />
                  <span className="min-w-0">
                    <p className="whitespace-pre-line text-lg text-paper">{quote.text}</p>
                    {creditForAuthor(quote.author).id === 'on' ? (
                      <p className="mt-2 text-sm text-quiet">{quote.author}</p>
                    ) : null}
                  </span>
                </span>
                <span className="flex flex-wrap justify-center gap-4 sm:shrink-0 sm:justify-end">
                  {publicPrintProducts.map((product) => (
                    <Link
                      key={product.id}
                      href={printHref(quote.slug, { productId: product.id })}
                      className="tag font-semibold"
                    >
                      {product.name}
                    </Link>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-center text-quiet">No quotes yet.</p>
        )}
        <Pager
          page={page}
          pages={pages}
          total={total}
          pageSize={pageSize}
          href={(p) => shopHref({ tag, page: p, sort, seed })}
        />
        <form action={printHref(customPrintSlug)} method="get" className="mt-16 space-y-4 border-t border-line pt-12">
          <p className="text-lg text-paper">Or write your own.</p>
          <label className="block">
            <span className="mb-2 block text-[11px] uppercase tracking-[0.2em] text-quiet">Line</span>
            <textarea
              name="text"
              required
              rows={4}
              maxLength={quoteCard.quote.maxChars}
              className="w-full resize-none border border-line bg-ink px-4 py-3 text-paper outline-none focus:border-paper/40"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-[11px] uppercase tracking-[0.2em] text-quiet">Author</span>
            <input
              name="author"
              maxLength={80}
              placeholder="Optional"
              className="w-full border border-line bg-ink px-4 py-3 text-paper outline-none focus:border-paper/40"
            />
          </label>
          <span className="flex flex-wrap justify-center gap-4 sm:justify-start">
            {publicPrintProducts.map((product) => (
              <button key={product.id} type="submit" name="product" value={product.id} className="tag font-semibold">
                {product.name}
              </button>
            ))}
          </span>
        </form>
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
        Tees and mugs carrying the quotes. Printed and shipped when you order, so nothing sits in a
        warehouse.
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
