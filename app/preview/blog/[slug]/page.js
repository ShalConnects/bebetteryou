import { notFound } from 'next/navigation'
import CardActions from '@/components/preview/CardActions'
import ReadingProgress from '@/components/preview/ReadingProgress'
import SectionHead from '@/components/preview/SectionHead'
import TableCard from '@/components/preview/TableCard'
import BlogArticle from '@/components/site/BlogArticle'
import { Page } from '@/components/site/ui'
import { appConfig } from '@/config/app'
import { previewCopy as c, pv } from '@/config/preview'
import { getPost, postQuotes, postTag, readingMinutes, relatedPosts } from '@/libs/blog'
import { printHref } from '@/libs/print-link'
import { isPrintableQuote } from '@/libs/quote-text'
import { relatedForPost } from '@/libs/related'

export default async function PreviewPost({ params }) {
  if (!appConfig.features.enableBlog) notFound()
  const { slug } = await params
  const post = getPost(slug)
  if (!post) notFound()
  const quotes = await postQuotes(post)
  const [card] = quotes
  const books = appConfig.features.enableBooks ? relatedForPost(post).books : []
  const wear = card && appConfig.features.enablePrintShop && isPrintableQuote(card) ? printHref(card.slug) : null

  return (
    <Page>
      <ReadingProgress />
      <p className="pv-kicker mb-4">{readingMinutes(post)} min read</p>
      <BlogArticle post={post} quotes={quotes} related={relatedPosts(post)} books={books} tag={postTag(post)} />
      {card ? (
        <section className="pv-table mt-16 max-w-2xl border-t border-line pt-12">
          <SectionHead title={c.noteCard} />
          <TableCard
            quote={card}
            href={pv(`/quotes/${card.slug}`)}
            variant="detail"
            className="mx-auto max-w-[18rem]"
          />
          <CardActions card={card} wearHref={wear} className="mt-6" />
        </section>
      ) : null}
    </Page>
  )
}
