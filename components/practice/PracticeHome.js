'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import NewsletterForm from '@/components/site/NewsletterForm'
import { ActionCard, PlanForm } from '@/components/practice/ActionCard'
import PracticeSync from '@/components/practice/PracticeSync'
import { analyticsEvents } from '@/config/analytics'
import { practiceCopy, practiceIntents } from '@/config/practice'
import { getUrl } from '@/config/app'
import { trackPractice } from '@/libs/analytics-client'
import {
  finishPractice,
  pushPracticeState,
  readPracticeState,
  returnMessage,
  returnTone,
  savePlan,
} from '@/libs/practice-store'

export default function PracticeHome({ resetItem, pinnedItem = null, intentItems }) {
  const [intentId, setIntentId] = useState(null)
  const [holdPin, setHoldPin] = useState(Boolean(pinnedItem))
  const [showNewsletter, setShowNewsletter] = useState(false)
  const [welcome, setWelcome] = useState('')
  const viewed = useRef(new Set())

  const active = useMemo(() => {
    if (intentId) return intentItems[intentId] || resetItem
    if (holdPin && pinnedItem) return pinnedItem
    return resetItem
  }, [intentId, intentItems, resetItem, holdPin, pinnedItem])

  const mode = intentId ? 'intent' : holdPin && pinnedItem ? 'pin' : 'reset'
  const shareUrl = getUrl(`/practice?item=${encodeURIComponent(active.id)}`)

  useEffect(() => {
    setWelcome(returnMessage(returnTone(readPracticeState())))
  }, [])

  useEffect(() => {
    const key = `${mode}:${active.id}`
    if (viewed.current.has(key)) return
    viewed.current.add(key)
    trackPractice(analyticsEvents.motivationViewed, active.id, mode)
  }, [active.id, mode])

  function onCreated(plan) {
    const state = savePlan(plan)
    pushPracticeState(state)
    return state.plans[0]?.id || ''
  }

  function onCompleted({ planId, itemId }) {
    pushPracticeState(finishPractice({ planId, itemId, kind: mode }))
    setShowNewsletter(true)
  }

  function showReset() {
    setIntentId(null)
    setHoldPin(false)
  }

  return (
    <div className="space-y-10">
      <PracticeSync />
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
          {intentId || holdPin ? (
            <button type="button" className="tag" onClick={showReset}>
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
              welcome={welcome}
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
