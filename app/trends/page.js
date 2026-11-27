import { Page, PageIntro } from '@/components/site/ui'
import { getUrl } from '@/config/app'
import { buildMetadata } from '@/libs/seo'
import { readTrends } from '@/libs/trends/store'

export const revalidate = 3600
export const metadata = buildMetadata({
  title: 'Trends',
  description: 'A daily card inspired by what the US is talking about, newest first.',
  url: getUrl('/trends'),
})

const day = (date) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const sourceName = { google: 'Google', x: 'X', bluesky: 'Bluesky' }

/** Posted trend cards, each under its date and the trend that inspired it. */
export default async function TrendsPage() {
  const rows = await readTrends({ status: 'posted' })
  return (
    <Page>
      <PageIntro srTitle="Trends">What people were talking about that day, and a card to carry from it.</PageIntro>
      {rows.length ? (
        <ol className="grid grid-cols-1 gap-10 min-[400px]:grid-cols-2 md:grid-cols-3">
          {rows.map((row) => (
            <li key={row.date} id={row.date} className="scroll-mt-24 space-y-3">
              <p className="font-display text-sm text-quiet">
                {day(row.date)} · trending on {sourceName[row.source] || row.source}: <span className="text-body">{row.topic}</span>
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={row.src} alt={row.text} className="w-full" loading="lazy" />
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-center text-quiet">The first trend card is coming soon.</p>
      )}
    </Page>
  )
}
