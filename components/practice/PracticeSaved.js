'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { practiceCopy } from '@/config/practice'
import {
  completePlan,
  practiceStats,
  readPracticeState,
  toggleSaved,
} from '@/libs/practice-store'
import { analyticsEvents } from '@/config/analytics'
import { trackPractice } from '@/libs/analytics-client'

export default function PracticeSaved({ itemsById }) {
  const [state, setState] = useState(null)

  useEffect(() => {
    setState(readPracticeState())
  }, [])

  const stats = useMemo(() => (state ? practiceStats(state) : null), [state])

  function refresh() {
    setState(readPracticeState())
  }

  function unsave(id) {
    toggleSaved(id)
    refresh()
  }

  function finishPlan(id) {
    completePlan(id)
    trackPractice(analyticsEvents.planCompleted, id)
    refresh()
  }

  if (!state || !stats) {
    return <p className="text-sm text-quiet">Loading…</p>
  }

  const savedItems = state.saved.map((id) => itemsById[id]).filter(Boolean)

  return (
    <div className="space-y-10">
      <p>
        <Link href="/practice" className="nav-link">
          ← Back to Practice
        </Link>
      </p>

      <section>
        <h2 className="heading-sm">{practiceCopy.progressTitle}</h2>
        <p className="mt-2 text-sm text-body/70">{practiceCopy.progressSub}</p>
        <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <dt className="text-[11px] uppercase tracking-[0.2em] text-quiet">Days</dt>
            <dd className="mt-1 text-2xl text-paper">{stats.daysShownUp}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.2em] text-quiet">Saved</dt>
            <dd className="mt-1 text-2xl text-paper">{stats.savedCount}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.2em] text-quiet">Open plans</dt>
            <dd className="mt-1 text-2xl text-paper">{stats.openPlans}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.2em] text-quiet">Done plans</dt>
            <dd className="mt-1 text-2xl text-paper">{stats.donePlans}</dd>
          </div>
        </dl>
      </section>

      <section>
        <h2 className="heading-sm">{practiceCopy.savedTitle}</h2>
        {savedItems.length ? (
          <ul className="mt-4 space-y-4">
            {savedItems.map((item) => (
              <li key={item.id} className="border border-line p-4">
                <p className="text-paper">{item.thought}</p>
                <p className="mt-2 text-sm text-body/75">{item.action}</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <Link href={`/practice?item=${encodeURIComponent(item.id)}`} className="tag">
                    Open
                  </Link>
                  <button type="button" className="tag" onClick={() => unsave(item.id)}>
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-body/70">{practiceCopy.savedEmpty}</p>
        )}
      </section>

      <section>
        <h2 className="heading-sm">Plans</h2>
        {state.plans.length ? (
          <ul className="mt-4 space-y-4">
            {state.plans.map((plan) => (
              <li key={plan.id} className="border border-line p-4">
                <p className="leading-relaxed text-paper">
                  When <span className="text-accent">{plan.trigger}</span>, I will{' '}
                  <span className="text-accent">{plan.action}</span>.
                </p>
                <p className="mt-2 text-xs text-quiet">
                  {plan.completed ? 'Completed' : 'Open'}
                  {plan.itemId ? ` · ${plan.itemId}` : ''}
                </p>
                {!plan.completed ? (
                  <button type="button" className="btn mt-3" onClick={() => finishPlan(plan.id)}>
                    Mark complete
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-body/70">No plans yet — create one from Practice.</p>
        )}
      </section>
    </div>
  )
}
