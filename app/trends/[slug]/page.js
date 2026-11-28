import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Page } from '@/components/site/ui'
import { getUrl } from '@/config/app'
import { buildMetadata } from '@/libs/seo'
import { readTrends } from '@/libs/trends/store'
import { dateFromSlug, sourceName, trendDay, trendPath } from '@/libs/trends/url'

export const revalidate = 3600

async function getTrend(slug) {
  const [row] = await readTrends({ date: dateFromSlug(slug), status: 'posted' })
  return row && trendPath(row) === `/trends/${slug}` ? row : null
}

export async function generateMetadata({ params }) {
  const row = await getTrend((await params).slug)
  if (!row) return {}
  return buildMetadata({
    title: `${row.topic} quote · ${trendDay(row.date)}`,
    description: `"${row.text}" A card for ${row.topic}, trending on ${trendDay(row.date)}.`,
    url: getUrl(trendPath(row)),
    image: row.src,
  })
}

/** One trend card: what was trending, when, and the card it inspired. */
export default async function TrendPage({ params }) {
  const row = await getTrend((await params).slug)
  if (!row) notFound()
  return (
    <Page>
      <article className="mx-auto max-w-md space-y-5 text-center">
        <p className="font-display text-sm text-quiet">
          {trendDay(row.date)} · trending on {sourceName[row.source] || row.source}
        </p>
        <h1 className="font-display text-2xl text-body">{row.topic}</h1>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={row.src} alt={row.text} className="w-full" />
        <blockquote className="text-lg text-body/90">“{row.text}”</blockquote>
        <Link href="/trends" className="nav-link">
          All trends
        </Link>
      </article>
    </Page>
  )
}
