import Link from 'next/link'
import NewsletterForm from '@/components/site/NewsletterForm'
import QuoteCard from '@/components/site/QuoteCard'
import { blogCta } from '@/config/blog'
import { postHref } from '@/libs/blog-url'
import { formatTag, quotesHref } from '@/libs/quotes-url'

function Heading({ children }) {
  return children ? <h2 className="heading-sm mb-4 mt-12">{children}</h2> : null
}

function Prose({ children }) {
  return <p className="mt-4 leading-relaxed text-body/85">{children}</p>
}

/** Blocks are typed data, so generated rows can never inject markup. */
function Block({ block, quotes, tag }) {
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
        <div className="mt-4 grid grid-cols-2 gap-px bg-line sm:grid-cols-3">
          {quotes.map((quote) => (
            <QuoteCard key={quote.slug} quote={quote} />
          ))}
        </div>
        {tag ? (
          <p className="mt-4">
            <Link href={quotesHref({ tag })} className="tag">
              All {formatTag(tag)} cards
            </Link>
          </p>
        ) : null}
      </section>
    )
  }

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

export default function BlogArticle({ post, quotes = [], related = [], tag }) {
  return (
    <article className="mx-auto w-full max-w-2xl">
      <header className="mb-2">
        <time className="text-[11px] uppercase tracking-[0.2em] text-quiet">{post.date}</time>
        <h1 className="heading mt-3">{post.heading || post.title}</h1>
        {post.excerpt ? <p className="lede">{post.excerpt}</p> : null}
      </header>

      {post.blocks?.map((block, i) => (
        <Block key={i} block={block} quotes={quotes} tag={tag} />
      ))}

      <section className="mt-16 border border-line p-6 md:p-8">
        <h2 className="heading-sm">{blogCta.title}</h2>
        <p className="mt-3 text-sm text-body/80">{blogCta.body}</p>
        <NewsletterForm />
        <p className="mt-6">
          <Link href={blogCta.href} className="tag">
            {blogCta.label}
          </Link>
        </p>
      </section>

      {related.length ? (
        <nav className="mt-16 border-t border-line pt-8" aria-label="Related posts">
          <h2 className="label mb-6 text-left">Keep reading</h2>
          <ul className="space-y-4">
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
    </article>
  )
}
