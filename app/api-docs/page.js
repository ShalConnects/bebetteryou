import { notFound } from 'next/navigation'
import { appConfig } from '@/config/app'
import { buildMetadata } from '@/libs/seo'
import ApiDocsClient from './ApiDocsClient'

export const metadata = buildMetadata({ title: 'API Documentation' })

export default function ApiDocsPage() {
  if (!appConfig.features.enableApiDocs) notFound()
  return <ApiDocsClient />
}