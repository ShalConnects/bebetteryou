import Link from 'next/link'
import { Page, PageIntro } from '@/components/site/ui'
import { getUrl } from '@/config/app'
import { param } from '@/libs/content'
import { SEARCH_MIN_LEN, normalizeQuery, searchSite } from '@/libs/search'
import { searchHref } from '@/libs/search-url'
import { buildMetadata, noIndex } from '@/libs/seo'

export async function generateMetadata({ searchParams }) {
  const sp = await searchParams
  const q = normalizeQuery(param(sp?.q))
  const url = getUrl(searchHref({ q }))
  return {
    ...buildMetadata({
      title: q ? `Search: ${q}` : 'Search',
      description: q
        ? `Results for “${q}” across quotes, notes, and books.`
        : 'Search quotes, notes, and books on BeBetterYou.',
      url,
    }),
    ...noIndex,
    alternates: { canonical: url },
  }
}

function ResultLink({ item }) {
  const className =
    'group block border-b border-line py-4 last:border-b-0 transition-colors hover:bg-ink-soft/40 -mx-2 px-2 sm:-mx-3 sm:px-3'
  const body = (
    <>
      <p className="text-base text-paper transition-opacity group-hover:opacity-70">{item.title}</p>
      {item.subtitle ? (
        <p className="mt-1 line-clamp-2 text-sm text-body/70">{item.subtitle}</p>
      ) : null}
    </>
  )
  if (item.external) {
    return (
      <a href={item.href} target="_blank" rel={item.rel || 'noopener noreferrer'} className={className}>
        {body}
      </a>
    )
  }
  return (
    <Link href={item.href} className={className}>
      {body}
    </Link>
  )
}

export default async function SearchPage({ searchParams }) {
  const sp = await searchParams
  const q = normalizeQuery(param(sp?.q))
  const { groups, total } = q.length >= SEARCH_MIN_LEN ? await searchSite(q) : { groups: [], total: 0 }
  const tooShort = q.length > 0 && q.length < SEARCH_MIN_LEN

  return (
    <Page narrow>
      <PageIntro title={q ? `“${q}”` : 'Search'} srTitle="Search">
        {q
          ? total
            ? `${total} result${total === 1 ? '' : 's'} across the site.`
            : tooShort
              ? `Type at least ${SEARCH_MIN_LEN} characters.`
              : 'Nothing matched — try another word or a tag.'
          : 'Find a quote, note, or book.'}
      </PageIntro>

      <form action="/search" method="get" className="mb-10" role="search">
        <label className="sr-only" htmlFor="site-search-q">
          Search
        </label>
        <div className="flex gap-3">
          <input
            id="site-search-q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Quotes, notes, books…"
            autoComplete="off"
            enterKeyHint="search"
            className="min-w-0 flex-1 border border-line bg-ink px-4 py-3 text-paper outline-none placeholder:text-quiet focus:border-paper/40"
          />
          <button type="submit" className="btn shrink-0">
            Search
          </button>
        </div>
      </form>

      {groups.length ? (
        <div className="space-y-10">
          {groups.map((group) => (
            <section key={group.type} aria-labelledby={`search-${group.type}`}>
              <h2
                id={`search-${group.type}`}
                className="text-[11px] uppercase tracking-[0.28em] text-quiet"
              >
                {group.label}
              </h2>
              <ul className="mt-3 border-t border-line">
                {group.items.map((item) => (
                  <li key={`${item.type}-${item.href}`}>
                    <ResultLink item={item} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : null}
    </Page>
  )
}
