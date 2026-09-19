'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { practiceCopy } from '@/config/practice'
import { analyticsEvents } from '@/config/analytics'
import { trackPractice } from '@/libs/analytics-client'
import { pushPracticeState, savePlan } from '@/libs/practice-store'

/** Additive blog block — does not alter post body. */
export default function TryThis({ item }) {
  const router = useRouter()
  if (!item) return null

  const steps = Array.isArray(item.tryThisSteps) && item.tryThisSteps.length
    ? item.tryThisSteps
    : [item.action, item.question ? `Ask yourself: ${item.question}` : null, 'Write an if-then plan and keep it small.'].filter(
        Boolean
      )

  function makePlan() {
    pushPracticeState(
      savePlan({
        trigger: item.tryThisTrigger || 'I sit down to work',
        action: item.action,
        itemId: item.id,
      })
    )
    trackPractice(analyticsEvents.planCreated, item.id)
    router.push('/practice/saved')
  }

  return (
    <aside className="mt-12 border border-line p-5" aria-label={practiceCopy.tryThisLabel}>
      <p className="text-[11px] uppercase tracking-[0.2em] text-quiet">{practiceCopy.tryThisLabel}</p>
      <p className="mt-3 text-paper">{item.thought}</p>
      <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-body/85">
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" className="btn" onClick={makePlan}>
          {practiceCopy.tryThisCta}
        </button>
        <Link href={`/practice?item=${encodeURIComponent(item.id)}`} className="tag">
          Open in Practice
        </Link>
      </div>
    </aside>
  )
}
