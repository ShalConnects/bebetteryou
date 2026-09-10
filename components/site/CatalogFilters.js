import FilterMenu from '@/components/site/FilterMenu'
import { formatTag, quoteSorts } from '@/libs/quotes-url'

/** Sort + tags for /quotes and /shop. `hrefFor` is the route's query builder. */
export default function CatalogFilters({ hrefFor, tag, sort, seed, tags = [] }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-5 md:justify-end">
      <FilterMenu
        label="Sort"
        active={sort}
        options={quoteSorts.map((s) => ({
          ...s,
          href: hrefFor({ tag, sort: s.id, seed: s.id === 'random' ? undefined : seed }),
        }))}
      />
      <FilterMenu
        label="Tags"
        active={tag}
        options={[
          { label: 'All', href: hrefFor({ sort, seed }) },
          ...tags.map((t) => ({
            id: t,
            label: formatTag(t),
            href: hrefFor({ sort, seed, tag: t }),
          })),
        ]}
      />
    </div>
  )
}
