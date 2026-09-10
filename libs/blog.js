import { blogPageSize, blogQuoteCount, relatedCount } from '@/config/blog'
import { readGrid, readPosts } from '@/libs/blog-store'
import { listQuotes } from '@/libs/content'
import { paginate } from '@/libs/paging'
import { sample } from '@/libs/sample'

const isLive = (p) => p.status !== 'draft'
const byNewest = (a, b) => String(b.date).localeCompare(String(a.date))

/** Stable per-slug seed so a post always deals the same cards. */
function seedFrom(slug) {
  let h = 0
  for (let i = 0; i < slug.length; i++) h = (Math.imul(31, h) + slug.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function findTopic(id) {
  return readGrid().topics.find((t) => t.id === id)
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

/** Same topic first, then same modifier, then recent — always fills `count`. */
export function relatedPosts(post, count = relatedCount) {
  const score = (p) =>
    (p.topic === post.topic ? 2 : 0) + (p.modifier && p.modifier === post.modifier ? 1 : 0)
  return listPosts()
    .filter((p) => p.slug !== post.slug)
    .sort((a, b) => score(b) - score(a) || byNewest(a, b))
    .slice(0, count)
}

/** Real quote cards for the post's tag — varied across pages, fixed per page. */
export async function postQuotes(post, count = blogQuoteCount) {
  const tag = post.tag || findTopic(post.topic)?.tag
  return tag ? sample(await listQuotes(tag), count, seedFrom(post.slug)) : []
}
