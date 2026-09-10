import { appConfig } from '@/config/app'
import { listQuotes } from '@/libs/content'
import { listPosts } from '@/libs/blog'
import { postHref } from '@/libs/blog-url'

/** Build Next.js metadata from central app config */
export function buildMetadata({ title, description, image, url } = {}) {
  const baseUrl = appConfig.siteUrl.replace(/\/$/, '')
  const appName = appConfig.name
  const desc = description || appConfig.description
  const ogImage = image
    ? image.startsWith('http')
      ? image
      : `${baseUrl}${image}`
    : `${baseUrl}${appConfig.metadata.ogImage}`

  return {
    title: title ? `${title} | ${appName}` : appConfig.metadata.title,
    description: desc,
    keywords: appConfig.metadata.keywords,
    authors: [{ name: appConfig.metadata.author }],
    openGraph: {
      title: title || appName,
      description: desc,
      url: url || baseUrl,
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
    robots: { index: true, follow: true },
  }
}

/** Static + generated routes for App Router sitemap.js */
export async function getSitemapEntries() {
  const base = appConfig.siteUrl.replace(/\/$/, '')
  const blog = appConfig.features.enableBlog
  const paths = ['', '/quotes', ...(blog ? ['/blog'] : []), '/about', '/shop', '/privacy-policy', '/tos']
  const staticEntries = paths.map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: path === '' ? 'daily' : 'weekly',
    priority: path === '' ? 1 : 0.8,
  }))
  const quoteEntries = (await listQuotes()).map(({ slug }) => ({
    url: `${base}/quotes/${slug}`,
    lastModified: new Date(),
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
  return [...staticEntries, ...quoteEntries, ...postEntries]
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
