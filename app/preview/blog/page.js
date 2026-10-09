import { notFound } from 'next/navigation'
import Chips from '@/components/preview/Chips'
import PostTile from '@/components/preview/PostTile'
import SectionHead from '@/components/preview/SectionHead'
import { Page, Pager } from '@/components/site/ui'
import { appConfig } from '@/config/app'
import { blogIntro } from '@/config/blog'
import { previewCopy as c, pv } from '@/config/preview'
import { pagePosts, postQuotes, postTopics, readingMinutes } from '@/libs/blog'
import { blogHref } from '@/libs/blog-url'
import { param } from '@/libs/content'

export default async function PreviewBlog({ searchParams }) {
  if (!appConfig.features.enableBlog) notFound()
  const sp = await searchParams
  const topic = param(sp?.topic)
  const { items, page, pages, total, pageSize } = pagePosts(topic, param(sp?.page))
  const cards = await Promise.all(items.map((p) => postQuotes(p, 1).then((q) => q[0])))
  const href = (opts) => pv(blogHref(opts))
  const topics = [{ id: undefined, label: c.all }, ...postTopics()]

  return (
    <Page>
      <SectionHead as="h1" title={c.blogTitle} sub={blogIntro} />
      <Chips
        label="Topics"
        className="mb-10"
        items={topics.map((t) => ({
          key: t.id || 'all',
          label: t.label,
          href: href({ topic: t.id }),
          active: topic === t.id,
        }))}
      />
      <ul className="grid gap-4 md:grid-cols-3">
        {items.map((post, i) => {
          const featured = i === 0 && page === 1
          return (
            <li key={post.slug} className={featured ? 'md:col-span-3' : undefined}>
              <PostTile post={post} card={cards[i]} minutes={readingMinutes(post)} featured={featured} />
            </li>
          )
        })}
      </ul>
      <Pager page={page} pages={pages} total={total} pageSize={pageSize} href={(p) => href({ topic, page: p })} />
    </Page>
  )
}
