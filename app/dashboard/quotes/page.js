import ScheduleBoard from '@/components/dashboard/ScheduleBoard'
import QuoteManager from '@/components/dashboard/QuoteManager'
import WeekReview from '@/components/dashboard/WeekReview'
import DashSection from '@/components/dashboard/DashSection'
import QuoteForm from '@/components/site/QuoteForm'
import { PageIntro } from '@/components/site/ui'
import { requireAdminPage } from '@/libs/dashboard-auth'
import { scriptureThemeOptions } from '@/libs/manage-scripture'
import { listAllSchedules } from '@/libs/social/schedule-store'
import { nextQuoteN, readQuotes } from '@/libs/quotes-store'
import { readTags, tagNames } from '@/libs/tags-store'
import { fridayWeekRange, pickWeekReviewQuotes, publicRange } from '@/libs/week-review'

export const metadata = { title: 'Manage quotes' }

export default async function AdminQuotesPage() {
  await requireAdminPage()
  const [quotes, tags, schedules, themeOptions] = await Promise.all([
    readQuotes(),
    readTags(),
    listAllSchedules({ limit: 100 }),
    scriptureThemeOptions(),
  ])
  const tagOptions = tagNames(tags)
  const range = fridayWeekRange()
  const { quotes: weekQuotes, mode: weekMode } = await pickWeekReviewQuotes(quotes, range)

  return (
    <div className="space-y-12">
      <PageIntro title="Manage quotes">
        Create cards, schedule social posts, and edit the library. Cron posts due items daily at 14:00 UTC.
      </PageIntro>

      <DashSection title="New quote" description="Generate a card and publish it.">
        <QuoteForm
          nextN={nextQuoteN(quotes)}
          tagOptions={tagOptions}
          themeOptions={themeOptions}
          catalog={quotes.filter((q) => q.text).map(({ n, slug, text }) => ({ n, slug, text }))}
        />
      </DashSection>

      <DashSection
        title="Week in review"
        description="Friday publish: Sat–Thu cards as collage (IG/FB/Bluesky/Telegram/Pinterest), YouTube Short, Threads thread, and digest email."
        defaultOpen
      >
        <WeekReview quotes={weekQuotes} range={publicRange(range)} mode={weekMode} />
      </DashSection>

      <DashSection
        title="Schedules"
        description="Upcoming social posts. Cancel anytime before cron runs (14:00 UTC)."
        defaultOpen={false}
      >
        <ScheduleBoard initial={schedules} />
      </DashSection>

      <DashSection
        title="Cards"
        description="Search, filter, and edit quote cards in the library."
        defaultOpen={false}
      >
        <QuoteManager quotes={quotes} tagOptions={tagOptions} />
      </DashSection>
    </div>
  )
}
