import ScheduleBoard from '@/components/dashboard/ScheduleBoard'
import QuoteManager from '@/components/dashboard/QuoteManager'
import WeekReview from '@/components/dashboard/WeekReview'
import DashSection from '@/components/dashboard/DashSection'
import QuoteForm from '@/components/site/QuoteForm'
import { PageIntro } from '@/components/site/ui'
import { requireAdminPage } from '@/libs/dashboard-auth'
import { scheduleFailures } from '@/libs/dashboard-ops'
import { scriptureThemeOptions } from '@/libs/manage-scripture'
import { readPostsBySlugs } from '@/libs/social/post-store'
import { listAllSchedules } from '@/libs/social/schedule-store'
import { nextQuoteN, readQuotes } from '@/libs/quotes-store'
import { readTags, tagNames } from '@/libs/tags-store'
import { fridayWeekRange, pickWeekReviewQuotes, publicRange } from '@/libs/week-review'

export const metadata = { title: 'Quotes' }

export default async function AdminQuotesPage({ searchParams }) {
  await requireAdminPage()
  const params = (await searchParams) || {}
  const focusQuote = String(params.quote || '').trim() || null
  const retry = String(params.retry || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const section = String(params.section || '').trim()

  const [quotes, tags, schedules, themeOptions] = await Promise.all([
    readQuotes(),
    readTags(),
    listAllSchedules({ limit: 100 }),
    scriptureThemeOptions(),
  ])
  const postsBySlug = await readPostsBySlugs(schedules.map((s) => s.slug))

  const tagOptions = tagNames(tags)
  const range = fridayWeekRange()
  const { quotes: weekQuotes, mode: weekMode } = await pickWeekReviewQuotes(quotes, range)
  const hasFails = scheduleFailures(schedules, { postsBySlug }).length > 0
  const openCards = Boolean(focusQuote) || section === 'cards'
  const openSchedules = section === 'schedules' || (!openCards && hasFails)
  const openWeek = section === 'week'

  return (
    <div className="space-y-12">
      <PageIntro title="Quotes">
        Create cards, schedule social posts, and edit the library. Cron posts due items daily at 14:00
        UTC (~20:00 Bangladesh).
      </PageIntro>

      <DashSection
        id="section-new"
        persistKey="quotes-new"
        title="New quote"
        description="Generate a card and publish it."
        defaultOpen={!openCards && !openSchedules && !openWeek}
      >
        <QuoteForm
          nextN={nextQuoteN(quotes)}
          tagOptions={tagOptions}
          themeOptions={themeOptions}
          catalog={quotes.filter((q) => q.text).map(({ n, slug, text }) => ({ n, slug, text }))}
        />
      </DashSection>

      <DashSection
        id="section-week"
        persistKey="quotes-week"
        title="Week in review"
        description="Friday publish: Sat–Thu cards as Instagram carousel, collage (FB/Bluesky/Telegram/Pinterest), YouTube Short, Threads thread, and digest email."
        defaultOpen={openWeek}
      >
        <WeekReview quotes={weekQuotes} range={publicRange(range)} mode={weekMode} />
      </DashSection>

      <DashSection
        id="section-schedules"
        persistKey="quotes-schedules"
        title="Schedules"
        description="Upcoming posts, recent runs, and network failures. Retry failed networks here."
        defaultOpen={openSchedules}
      >
        <ScheduleBoard initial={schedules} postsBySlug={postsBySlug} />
      </DashSection>

      <DashSection
        id="section-cards"
        persistKey="quotes-cards"
        title="Cards"
        description="Search, filter, and edit quote cards in the library."
        defaultOpen={openCards}
      >
        <QuoteManager
          quotes={quotes}
          tagOptions={tagOptions}
          initialSlug={focusQuote}
          initialRetry={retry}
        />
      </DashSection>
    </div>
  )
}
