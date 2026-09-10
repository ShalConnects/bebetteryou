import { notFound } from 'next/navigation'
import BlogArticle from '@/components/site/BlogArticle'
import { Page } from '@/components/site/ui'
import { appConfig, getUrl } from '@/config/app'
import { getPost, listPosts, postQuotes, postTag, relatedPosts } from '@/libs/blog'
import { postHref } from '@/libs/blog-url'
import { relatedForPost } from '@/libs/related'
import { buildMetadata, postJsonLd } from '@/libs/seo'

export function generateStaticParams() {
  return listPosts().map(({ slug }) => ({ slug }))
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) return buildMetadata({ title: 'Post' })
  const url = getUrl(postHref(post.slug))
  return {
    ...buildMetadata({ title: post.title, description: post.description, url }),
    alternates: { canonical: url },
  }
}

export default async function PostPage({ params }) {
  if (!appConfig.features.enableBlog) notFound()
  const { slug } = await params
  const post = getPost(slug)
  if (!post) notFound()

  const tag = postTag(post)
  const quotes = await postQuotes(post)
  const books = appConfig.features.enableBooks ? relatedForPost(post).books : []
  const url = getUrl(postHref(post.slug))

  return (
    <Page>
      <BlogArticle
        post={post}
        quotes={quotes}
        related={relatedPosts(post)}
        books={books}
        tag={tag}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(postJsonLd(post, url)) }}
      />
    </Page>
  )
}
