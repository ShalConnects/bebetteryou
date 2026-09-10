import { blogPageSize, blogQuoteCount, relatedCount } from '@/config/blog'
import { readGrid, readPosts } from '@/libs/blog-store'
import { listQuotes } from '@/libs/content'
import { hybridPick } from '@/libs/hybrid-pick'
import { paginate } from '@/libs/paging'
import { seedFromKey } from '@/libs/scripture-core'

const isLive = (p) => p.status !== 'draft'
const byNewest = (a, b) => String(b.date).localeCompare(String(a.date))

export function findTopic(id) {
  return readGrid().topics.find((t) => t.id === id)
}

/** Tag is the join key across quotes / scripture / blog. Topic is only SEO labeling. */
export function postTag(post) {
  return post?.tag || findTopic(post?.topic)?.tag || null
}

export function listPosts(topic) {
  return readPosts()
    .filter((p) => isLive(p) && (!topic || p.topic === topic))
    .sort(byNewest)
}

export function pagePosts(topic, page) {
  return paginate(listPosts(topic), page, blogPageSize)
}

export function getPost(slug) {
  return readPosts().find((p) => p.slug === slug && isLive(p))
}

/** Grid topics that actually have live posts (hub filters). */
export function postTopics() {
  const used = new Set(listPosts().map((p) => p.topic))
  return readGrid().topics.filter((t) => used.has(t.id))
}

/** Same topic, then shared tag, then modifier — always fills `count`. */
export function relatedPosts(post, count = relatedCount) {
  const tag = postTag(post)
  const score = (p) =>
    (p.topic === post.topic ? 2 : 0) +
    (tag && postTag(p) === tag ? 1 : 0) +
    (p.modifier && p.modifier === post.modifier ? 1 : 0)
  return listPosts()
    .filter((p) => p.slug !== post.slug)
    .sort((a, b) => score(b) - score(a) || byNewest(a, b))
    .slice(0, count)
}

/**
 * Cards for a post: block `slugs` / `related.quotes` pins first, then soft by tag.
 */
export async function postQuotes(post, count = blogQuoteCount) {
  const pins = post.blocks?.find((b) => b.type === 'quotes')?.slugs || post.related?.quotes
  const tag = postTag(post)
  return hybridPick({
    pool: await listQuotes(),
    pins,
    tags: tag ? [tag] : [],
    count,
    seed: seedFromKey(post.slug),
  })
}
