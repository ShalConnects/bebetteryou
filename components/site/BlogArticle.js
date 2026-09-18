import Link from 'next/link'
import NewsletterForm from '@/components/site/NewsletterForm'
import QuoteCard from '@/components/site/QuoteCard'
import TryThis from '@/components/practice/TryThis'
import { RelatedBooks } from '@/components/site/RelatedContent'
import TraditionPassage from '@/components/site/TraditionPassage'
import { appConfig } from '@/config/app'
import { blogCta } from '@/config/blog'
import { copy } from '@/config/site'
import { blogHref, postHref } from '@/libs/blog-url'
import { itemForPost } from '@/libs/practice'
import { quoteShowsScripture } from '@/libs/scripture-core'
import { formatTag, quotesHref } from '@/libs/quotes-url'

function Heading({ children }) {
  return children ? <h2 className="heading-sm mb-4 mt-12">{children}</h2> : null
}

function Prose({ children }) {
  return <p className="mt-4 leading-relaxed text-body/85">{children}</p>
}

function ThemeLinks({ tag, topic }) {
  if (!tag) return null
  return (
    <p className="mt-4 flex flex-wrap gap-5">
      <Link href={quotesHref({ tag })} className="tag">
        All {formatTag(tag)} cards
      </Link>
      {topic ? (
        <Link href={blogHref({ topic })} className="tag">
          More notes
        </Link>
      ) : null}
    </p>
  )
}

function Scripture({ tag, slug, heading }) {
  if (!tag || !quoteShowsScripture([tag])) return null
  return (
    <section>
      <Heading>{heading || 'A related passage'}</Heading>
      <TraditionPassage tags={[tag]} slug={slug} className="border-0 pt-0" />
    </section>
  )
}

/** Blocks are typed data, so generated rows can never inject markup. */
function Block({ block, quotes, tag, topic, slug }) {
  const { type, heading, text, items } = block

  if (type === 'p') return <Prose>{text}</Prose>

  if (type === 'section') {
    return (
      <section>
        <Heading>{heading}</Heading>
        {text ? <Prose>{text}</Prose> : null}
        {items?.length ? (
          <ul className="mt-4 space-y-3">
            {items.map((item) => (
              <li key={item} className="flex gap-3 text-body/85">
                <span aria-hidden className="text-quiet">
                  —
                </span>
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    )
  }

  if (type === 'quotes') {
    if (!quotes.length) return null
    return (
      <section>
        <Heading>{heading}</Heading>
        <div className="mt-4 grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 md:grid-cols-3 md:gap-4">
          {quotes.map((quote) => (
            <QuoteCard key={quote.slug} quote={quote} />
          ))}
        </div>
        <ThemeLinks tag={tag} topic={topic} />
      </section>
    )
  }

  if (type === 'scripture') return <Scripture tag={tag} slug={slug} heading={heading} />

  if (type === 'faq') {
    return (
      <section>
        <Heading>{heading}</Heading>
        <dl className="mt-4 divide-y divide-line">
          {items?.map(({ q, a }) => (
            <div key={q} className="py-5 first:pt-0">
              <dt className="text-paper">{q}</dt>
              <dd className="mt-2 leading-relaxed text-body/75">{a}</dd>
            </div>
          ))}
        </dl>
      </section>
    )
  }

  return null
}

export default function BlogArticle({ post, quotes = [], related = [], books = [], tag }) {
  const hasScripture = post.blocks?.some((b) => b.type === 'scripture')

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_min(18rem,100%)] lg:items-start lg:gap-16">
      <article className="min-w-0 max-w-2xl">
        <header className="mb-2">
          <time className="text-[11px] uppercase tracking-[0.2em] text-quiet">{post.date}</time>
          <h1 className="heading mt-3">{post.heading || post.title}</h1>
          {post.excerpt ? <p className="lede">{post.excerpt}</p> : null}
        </header>

        {post.blocks?.map((block, i) => (
          <Block key={i} block={block} quotes={quotes} tag={tag} topic={post.topic} slug={post.slug} />
        ))}

        {!hasScripture ? <Scripture tag={tag} slug={post.slug} /> : null}

        {appConfig.features.enablePractice ? <TryThis item={itemForPost(post)} /> : null}
      </article>

      <aside className="space-y-10 lg:sticky lg:top-24" aria-label="Related">
        <RelatedBooks books={books} className="border-t border-line pt-5 lg:border-t-0 lg:pt-0" />

        <section className="border border-line p-5">
          <h2 className="heading-sm">{copy.newsletterTitle}</h2>
          <p className="mt-2 text-sm leading-relaxed text-body/75">{copy.newsletterSub}</p>
          <NewsletterForm compact />
          <p className="mt-5">
            <Link href={blogCta.href} className="tag">
              {blogCta.label}
            </Link>
          </p>
        </section>

        {related.length ? (
          <nav className="border-t border-line pt-5" aria-label="Related posts">
            <p className="text-[11px] uppercase tracking-[0.2em] text-quiet">Keep reading</p>
            <ul className="mt-4 space-y-3">
              {related.map((p) => (
                <li key={p.slug}>
                  <Link href={postHref(p.slug)} className="text-body/85 transition-colors hover:text-paper">
                    {p.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </aside>
    </div>
  )
}
