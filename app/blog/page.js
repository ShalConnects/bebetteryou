import { notFound } from 'next/navigation'
import FilterMenu from '@/components/site/FilterMenu'
import { BlogList, Page, PageIntro, Pager } from '@/components/site/ui'
import { blogIntro } from '@/config/blog'
import { appConfig, getUrl } from '@/config/app'
import { findTopic, pagePosts, postTopics } from '@/libs/blog'
import { blogHref, blogListTitle } from '@/libs/blog-url'
import { param } from '@/libs/content'
import { pageRange } from '@/libs/paging'
import { buildMetadata, noIndex } from '@/libs/seo'

export async function generateMetadata({ searchParams }) {
  if (!appConfig.features.enableBlog) return noIndex
  const sp = await searchParams
  const topic = param(sp?.topic)
  const label = findTopic(topic)?.label
  const { page, total, pageSize } = pagePosts(topic, param(sp?.page))
  const range = pageRange(page, pageSize, total)
  const url = getUrl(blogHref({ topic, page }))
  return {
    ...buildMetadata({
      title: blogListTitle({ label, page }),
      description: range ? `${blogIntro} Posts ${range.start}–${range.end} of ${range.total}.` : blogIntro,
      url,
    }),
    alternates: { canonical: url },
  }
}

export default async function BlogPage({ searchParams }) {
  if (!appConfig.features.enableBlog) notFound()
  const sp = await searchParams
  const topic = param(sp?.topic)
  const { items, page, pages, total, pageSize } = pagePosts(topic, param(sp?.page))

  return (
    <Page>
      <PageIntro
        title={findTopic(topic)?.label}
        srTitle="Blog"
        aside={
          <FilterMenu
            label="Topics"
            active={topic}
            options={[
              { label: 'All', href: blogHref() },
              ...postTopics().map((t) => ({ ...t, href: blogHref({ topic: t.id }) })),
            ]}
          />
        }
      >
        {blogIntro}
      </PageIntro>
      <BlogList posts={items} />
      <Pager
        page={page}
        pages={pages}
        total={total}
        pageSize={pageSize}
        href={(p) => blogHref({ topic, page: p })}
      />
    </Page>
  )
}
