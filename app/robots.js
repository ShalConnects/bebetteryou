import { appConfig } from '@/config/app'

export default function robots() {
  const base = appConfig.siteUrl.replace(/\/$/, '')
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/api/', '/auth/', '/pricing', '/api-docs'],
    },
    sitemap: `${base}/sitemap.xml`,
  }
}
