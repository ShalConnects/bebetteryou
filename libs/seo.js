import { appConfig } from '@/config/app'
import { practiceDiscoverable } from '@/config/practice'
import { sitePitch } from '@/config/pitch'
import { listQuotes, quoteTags } from '@/libs/content'
import { quotesHref } from '@/libs/quotes-url'
import { quoteOneLine } from '@/libs/quote-text'
import { listPosts } from '@/libs/blog'
import { postHref } from '@/libs/blog-url'

export { sitePitch }

const siteBase = () => appConfig.siteUrl.replace(/\/$/, '')
const absolute = (src) => (src.startsWith('http') ? src : `${siteBase()}${src}`)

/**
 * Build Next.js metadata from central app config. Pass `url` for a page's own canonical
 * (og:url follows it); without one, neither is set, so pages never claim the homepage's URL.
 */
export function buildMetadata({ title, description, image, url, index = true } = {}) {
  const baseUrl = siteBase()
  const appName = appConfig.name
  const desc = description || sitePitch()
  const ogImage = absolute(image || appConfig.metadata.ogImage)

  return {
    metadataBase: new URL(baseUrl),
    ...(url ? { alternates: { canonical: url } } : {}),
    title: title ? `${title} | ${appName}` : appConfig.metadata.title,
    description: desc,
    keywords: appConfig.metadata.keywords,
    authors: [{ name: appConfig.metadata.author }],
    openGraph: {
      title: title || appName,
      description: desc,
      ...(url ? { url } : {}),
      siteName: appName,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title || appName }],
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: title || appName,
      description: desc,
      images: [ogImage],
    },
    robots: { index, follow: true },
  }
}

export const noIndex = { robots: { index: false, follow: false } }

/** Static + generated routes for App Router sitemap.js */
export async function getSitemapEntries() {
  const base = siteBase()
  const blog = appConfig.features.enableBlog
  const books = appConfig.features.enableBooks
  const practice = appConfig.features.enablePractice && practiceDiscoverable
  const paths = [
    '',
    '/quotes',
    ...(practice ? ['/practice', '/practice/saved'] : []),
    ...(blog ? ['/blog'] : []),
    ...(books ? ['/books'] : []),
    '/about',
    ...(appConfig.features.enablePrintShop ? ['/shop'] : []),
    '/privacy-policy',
    '/tos',
  ]
  const quotes = await listQuotes()
  // Pages change when a card is added, so the newest card dates the listings.
  const latest = quotes.reduce((max, q) => Math.max(max, Date.parse(q.publishAt || q.createdAt) || 0), 0)
  const listed = latest ? new Date(latest) : undefined
  const staticEntries = paths.map((path) => ({
    url: `${base}${path}`,
    ...(path === '' || path === '/quotes' ? { lastModified: listed } : {}),
    changeFrequency: path === '' ? 'daily' : 'weekly',
    priority: path === '' ? 1 : 0.8,
  }))
  const tagEntries = (await quoteTags()).map((tag) => ({
    url: `${base}${quotesHref({ tag })}`,
    lastModified: listed,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))
  const quoteEntries = quotes.map(({ slug, publishAt, createdAt }) => ({
    url: `${base}/quotes/${slug}`,
    ...(publishAt || createdAt ? { lastModified: new Date(publishAt || createdAt) } : {}),
    changeFrequency: 'monthly',
    priority: 0.6,
  }))
  // Drafts are excluded by listPosts, so unreviewed rows never reach Google.
  const postEntries = blog
    ? listPosts().map(({ slug, date, updated }) => ({
        url: `${base}${postHref(slug)}`,
        lastModified: new Date(updated || date),
        changeFrequency: 'monthly',
        priority: 0.7,
      }))
    : []
  return [...staticEntries, ...tagEntries, ...quoteEntries, ...postEntries]
}

/** Who we are + sitelinks search box. Rendered once, on the homepage. */
export function siteJsonLd() {
  const url = siteBase()
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: appConfig.name,
    url,
    publisher: { '@type': 'Organization', name: appConfig.name, url, logo: absolute(appConfig.metadata.ogImage) },
    potentialAction: {
      '@type': 'SearchAction',
      target: `${url}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }
}

/** A card as a schema.org Quotation (scanned cards have no text, so only the image). */
export function quoteJsonLd(quote, url) {
  const text = quoteOneLine(quote.text)
  const author = quote.author?.trim()
  return {
    '@context': 'https://schema.org',
    '@type': 'Quotation',
    url,
    image: absolute(quote.src),
    ...(text ? { text } : {}),
    ...(author ? { creator: { '@type': 'Person', name: author } } : {}),
    keywords: (quote.tags || []).join(', ') || undefined,
    publisher: { '@type': 'Organization', name: appConfig.name },
  }
}

/** Article (+ FAQ when the row has one) structured data for a generated post. */
export function postJsonLd(post, url) {
  const faq = post.blocks?.find((b) => b.type === 'faq' && b.items?.length)
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.updated || post.date,
    author: { '@type': 'Organization', name: appConfig.metadata.author },
    publisher: { '@type': 'Organization', name: appConfig.name },
    mainEntityOfPage: url,
  }
  if (post.image) {
    article.image = absolute(post.image)
  }
  if (!faq) return article
  return [
    article,
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.items.map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    },
  ]
}
