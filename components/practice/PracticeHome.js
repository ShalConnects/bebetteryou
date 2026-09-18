'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import NewsletterForm from '@/components/site/NewsletterForm'
import { ActionCard, PlanForm } from '@/components/practice/ActionCard'
import { analyticsEvents } from '@/config/analytics'
import { practiceCopy, practiceIntents } from '@/config/practice'
import { getUrl } from '@/config/app'
import { trackPractice } from '@/libs/analytics-client'
import { utcDayKey } from '@/libs/practice'
import { recordCompletion, savePlan } from '@/libs/practice-store'

export default function PracticeHome({ resetItem, intentItems }) {
  const [intentId, setIntentId] = useState(null)
  const [showNewsletter, setShowNewsletter] = useState(false)

  const active = useMemo(() => {
    if (intentId) return intentItems[intentId] || resetItem
    return resetItem
  }, [intentId, intentItems, resetItem])

  const mode = intentId ? 'intent' : 'reset'
  const shareUrl = getUrl(`/practice?item=${encodeURIComponent(active.id)}`)

  useEffect(() => {
    trackPractice(analyticsEvents.motivationViewed, active.id, mode)
  }, [active.id, mode])

  function onCreated(plan) {
    savePlan(plan)
  }

  function onCompleted() {
    recordCompletion({ itemId: active.id, kind: mode, dayKey: utcDayKey() })
    setShowNewsletter(true)
  }

  return (
    <div className="space-y-10">
      <nav className="flex flex-wrap gap-4 text-sm" aria-label="Practice">
        <Link href="/practice/saved" className="nav-link">
          Saved & progress
        </Link>
      </nav>

      <section aria-labelledby="intent-heading">
        <h2 id="intent-heading" className="heading-sm">
          {practiceCopy.intentLabel}
        </h2>
        <p className="mt-2 text-sm text-body/70">{practiceCopy.intentHint}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {practiceIntents.map((intent) => (
            <button
              key={intent.id}
              type="button"
              className={intentId === intent.id ? 'tag-active' : 'tag'}
              aria-pressed={intentId === intent.id}
              onClick={() => setIntentId(intent.id)}
            >
              {intent.label}
            </button>
          ))}
          {intentId ? (
            <button type="button" className="tag" onClick={() => setIntentId(null)}>
              {practiceCopy.resetLabel}
            </button>
          ) : null}
        </div>
      </section>

      <section aria-labelledby="reset-heading">
        <h2 id="reset-heading" className="heading-sm">
          {intentId ? practiceIntents.find((i) => i.id === intentId)?.label : practiceCopy.resetLabel}
        </h2>
        <p className="mt-2 text-sm text-body/70">{practiceCopy.disclaimer}</p>
        <div className="mt-5">
          <ActionCard item={active} url={shareUrl}>
            <PlanForm
              itemId={active.id}
              defaultAction={active.action}
              onCreated={onCreated}
              onCompleted={onCompleted}
            />
          </ActionCard>
        </div>
      </section>

      {showNewsletter ? (
        <section className="border border-line p-5">
          <h2 className="heading-sm">{practiceCopy.newsletterTitle}</h2>
          <p className="mt-2 text-sm text-body/75">{practiceCopy.newsletterSub}</p>
          <NewsletterForm compact />
        </section>
      ) : null}
    </div>
  )
}
