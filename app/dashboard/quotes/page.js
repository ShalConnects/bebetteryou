import ScheduleBoard from '@/components/dashboard/ScheduleBoard'
import ScheduleCalendar from '@/components/dashboard/ScheduleCalendar'
import QuoteManager from '@/components/dashboard/QuoteManager'
import WeekReview from '@/components/dashboard/WeekReview'
import QuoteForm from '@/components/site/QuoteForm'
import { DashPage, DashPanel } from '@/components/dashboard/ui'
import { contentTabs, pickTab } from '@/config/dashboard'
import { requireAdminPage } from '@/libs/dashboard-auth'
import { scriptureThemeOptions } from '@/libs/manage-scripture'
import { readPostsBySlugs } from '@/libs/social/post-store'
import { listAllSchedules } from '@/libs/social/schedule-store'
import { nextQuoteN, readQuotes } from '@/libs/quotes-store'
import { readTags, tagNames } from '@/libs/tags-store'
import { fridayWeekRange, pickWeekReviewQuotes, publicRange } from '@/libs/week-review'

export const metadata = { title: 'Content' }

/** Each tab fetches only what it renders. */
const tabs = {
  async schedules(quotes) {
    const schedules = await listAllSchedules({ limit: 100 })
    const postsBySlug = await readPostsBySlugs(schedules.map((s) => s.slug))
    return (
      <>
        <DashPanel title="Next 14 days" description="One post a day at 8 pm Bangladesh time (14:00 UTC cron).">
          <ScheduleCalendar schedules={schedules} quotes={quotes} postsBySlug={postsBySlug} />
        </DashPanel>
        <DashPanel title="Queue & history" description="Green posted, red failed, grey waiting — per network.">
          <ScheduleBoard
            initial={schedules}
            postsBySlug={postsBySlug}
            covers={Object.fromEntries(quotes.map((q) => [q.slug, q.src]))}
          />
        </DashPanel>
      </>
    )
  },
  async cards(quotes, params) {
    const retry = String(params.retry || '').split(',').map((s) => s.trim()).filter(Boolean)
    const [tags, themeOptions] = await Promise.all([readTags(), scriptureThemeOptions()])
    return (
      <QuoteManager
        quotes={quotes}
        tagOptions={tagNames(tags)}
        themeOptions={themeOptions}
        initialSlug={String(params.quote || '').trim() || null}
        initialRetry={retry}
        initialTag={String(params.tag || '')}
      />
    )
  },
  async new(quotes, params) {
    const [tags, themeOptions] = await Promise.all([readTags(), scriptureThemeOptions()])
    const withText = quotes.filter((q) => q.text)
    return (
      <DashPanel>
        <QuoteForm
          nextN={nextQuoteN(quotes)}
          tagOptions={tagNames(tags)}
          tagCatalog={tags}
          trainingQuotes={withText.filter((q) => q.tags?.length).map(({ text, tags: t }) => ({ text, tags: t }))}
          themeOptions={themeOptions}
          catalog={withText.map(({ n, slug, text }) => ({ n, slug, text }))}
          postDate={params.date}
        />
      </DashPanel>
    )
  },
  async week(quotes) {
    const range = fridayWeekRange()
    const { quotes: weekQuotes, mode } = await pickWeekReviewQuotes(quotes, range)
    return (
      <DashPanel description="Friday: Sat–Thu cards as a carousel, collage, YouTube Short, Threads thread and digest email.">
        <WeekReview quotes={weekQuotes} range={publicRange(range)} mode={mode} />
      </DashPanel>
    )
  },
}

export default async function AdminQuotesPage({ searchParams }) {
  await requireAdminPage()
  const params = (await searchParams) || {}
  const active = pickTab(contentTabs, params.section, params.quote ? 'cards' : 'schedules')
  const body = await tabs[active](await readQuotes(), params)

  return (
    <DashPage title="Content" description="Cards, the posting calendar and the weekly recap." tabs={contentTabs} active={active}>
      {body}
    </DashPage>
  )
}
