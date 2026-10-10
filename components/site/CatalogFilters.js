import FilterMenu from '@/components/site/FilterMenu'
import { formatTag, quoteSorts, quoteViews } from '@/libs/quotes-url'

/** Sort + tags (+ view when passed) for /quotes and /shop. `hrefFor` is the route's query builder. */
export default function CatalogFilters({ hrefFor, tag, sort, seed, view, tags = [] }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-5 md:justify-end">
      <FilterMenu
        label="Sort"
        active={sort}
        options={quoteSorts.map((s) => ({
          ...s,
          href: hrefFor({ tag, view, sort: s.id, seed: s.id === 'random' ? undefined : seed }),
        }))}
      />
      <FilterMenu
        label="Tags"
        active={tag}
        options={[
          { label: 'All', href: hrefFor({ sort, seed, view }) },
          ...tags.map((t) => ({
            id: t,
            label: formatTag(t),
            href: hrefFor({ sort, seed, view, tag: t }),
          })),
        ]}
      />
      {view ? (
        <FilterMenu
          label="View"
          active={view}
          options={quoteViews.map((v) => ({ ...v, href: hrefFor({ tag, sort, seed, view: v.id }) }))}
        />
      ) : null}
    </div>
  )
}
