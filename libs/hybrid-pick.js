import { sample } from '@/libs/sample'

/**
 * Hard pins first (by slug), then soft fill from items sharing any tag.
 * Pure — pools are passed in so domain modules stay thin.
 */
export function hybridPick({
  pool,
  pins = [],
  tags = [],
  exclude,
  count,
  seed,
  tagsOf = (item) => item.tags,
}) {
  if (!count || !pool?.length) return []
  const bySlug = new Map(pool.map((item) => [item.slug, item]))
  const pinned = []
  const seen = new Set(exclude ? [exclude] : [])

  for (const slug of pins) {
    const item = bySlug.get(slug)
    if (!item || seen.has(item.slug)) continue
    pinned.push(item)
    seen.add(item.slug)
    if (pinned.length >= count) return pinned
  }

  const tagSet = new Set(tags)
  const soft =
    tagSet.size === 0
      ? []
      : pool.filter((item) => !seen.has(item.slug) && tagsOf(item)?.some((t) => tagSet.has(t)))

  return [...pinned, ...sample(soft, count - pinned.length, seed)]
}
