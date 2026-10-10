import Link from 'next/link'
import { notFound } from 'next/navigation'
import CardActions from '@/components/preview/CardActions'
import PostTile from '@/components/preview/PostTile'
import ReadingProgress from '@/components/preview/ReadingProgress'
import SectionHead from '@/components/site/SectionHead'
import TableCard from '@/components/site/TableCard'
import BlogArticle from '@/components/site/BlogArticle'
import { Page } from '@/components/site/ui'
import { appConfig } from '@/config/app'
import { previewCopy as c, pv } from '@/config/preview'
import { getPost, listPosts, postQuotes, postTag, readingMinutes, relatedPosts } from '@/libs/blog'
import { postHref } from '@/libs/blog-url'
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
  const related = relatedPosts(post)
  const all = listPosts()
  const i = all.findIndex((p) => p.slug === post.slug)
  const [newer, older] = [all[i - 1], all[i + 1]]
  const wear = card && appConfig.features.enablePrintShop && isPrintableQuote(card) ? printHref(card.slug) : null

  return (
    <Page>
      <ReadingProgress />
      <BlogArticle
        post={post}
        quotes={quotes}
        related={[]}
        books={books}
        tag={postTag(post)}
        minutes={readingMinutes(post)}
      />
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
      {related.length ? (
        <section className="mt-16 border-t border-line pt-12">
          <SectionHead title={c.keepReading} />
          <ul className="grid gap-4 md:grid-cols-3">
            {related.map((p) => (
              <li key={p.slug}>
                <PostTile post={p} minutes={readingMinutes(p)} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <nav className="mt-12 flex justify-between gap-6 border-t border-line pt-5">
        {newer ? (
          <Link href={pv(postHref(newer.slug))} className="nav-link">
            ← {newer.title}
          </Link>
        ) : (
          <span />
        )}
        {older ? (
          <Link href={pv(postHref(older.slug))} className="nav-link text-right">
            {older.title} →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </Page>
  )
}
