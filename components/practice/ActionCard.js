'use client'

import { useEffect, useRef, useState } from 'react'
import { analyticsEvents } from '@/config/analytics'
import { appConfig } from '@/config/app'
import { practiceCopy } from '@/config/practice'
import { trackPractice } from '@/libs/analytics-client'
import { isSaved, pushPracticeState, toggleSaved } from '@/libs/practice-store'
import { shareTextForItem } from '@/libs/practice'
import { copyText, shareOrCopy } from '@/libs/share'

export function ActionCard({ item, url, children }) {
  const [saved, setSaved] = useState(false)
  const [shareMsg, setShareMsg] = useState('')

  useEffect(() => {
    setSaved(isSaved(item.id))
  }, [item.id])

  function flash(msg) {
    setShareMsg(msg)
    setTimeout(() => setShareMsg(''), 2000)
  }

  async function onSave() {
    const next = toggleSaved(item.id)
    const nowSaved = next.saved.includes(item.id)
    setSaved(nowSaved)
    pushPracticeState(next)
    if (nowSaved) trackPractice(analyticsEvents.itemSaved, item.id)
  }

  async function onShare() {
    try {
      const text = shareTextForItem(item, url)
      const msg = await shareOrCopy({
        title: item.title || appConfig.name,
        text,
        url,
      })
      trackPractice(analyticsEvents.itemShared, item.id, msg ? 'copy' : 'native')
      if (msg) flash(msg)
    } catch {
      /* cancelled */
    }
  }

  async function onCopyText() {
    try {
      flash(await copyText(shareTextForItem(item, url)))
      trackPractice(analyticsEvents.itemShared, item.id, 'copy-text')
    } catch {
      flash('Could not copy')
    }
  }

  return (
    <article className="border border-line p-5 sm:p-6">
      <p className="text-[11px] uppercase tracking-[0.2em] text-quiet">
        {item.category}
        {item.estimatedMinutes ? ` · ~${item.estimatedMinutes} min` : ''}
      </p>
      {item.title ? <h2 className="heading-sm mt-3">{item.title}</h2> : null}
      <p className="mt-4 text-lg leading-relaxed text-paper">{item.thought}</p>
      {item.context ? <p className="mt-2 text-sm text-body/65">{item.context}</p> : null}
      {item.question ? (
        <p className="mt-4 text-sm leading-relaxed text-body/75">
          <span className="text-quiet">Reflect: </span>
          {item.question}
        </p>
      ) : null}
      <p className="mt-5 leading-relaxed text-body/90">
        <span className="text-[11px] uppercase tracking-[0.2em] text-quiet">Action</span>
        <span className="mt-2 block text-paper">{item.action}</span>
      </p>
      {item.source ? (
        <p className="mt-4 text-xs text-quiet">
          {item.sourceUrl ? (
            <a href={item.sourceUrl} className="nav-link" rel="noopener noreferrer" target="_blank">
              {item.source}
            </a>
          ) : (
            item.source
          )}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" className="tag" onClick={onSave} aria-pressed={saved}>
          {saved ? 'Saved' : 'Save'}
        </button>
        <button type="button" className="tag" onClick={onShare}>
          Share
        </button>
        <button type="button" className="tag" onClick={onCopyText}>
          Copy text
        </button>
        {shareMsg ? <span className="text-sm text-quiet">{shareMsg}</span> : null}
      </div>

      {children}
    </article>
  )
}

export function PlanForm({ itemId = '', defaultAction = '', welcome = '', onCreated, onCompleted }) {
  const [trigger, setTrigger] = useState('')
  const [action, setAction] = useState(defaultAction)
  const [phase, setPhase] = useState('edit')
  const planIdRef = useRef('')

  useEffect(() => {
    setAction(defaultAction)
    setTrigger('')
    setPhase('edit')
    planIdRef.current = ''
  }, [itemId, defaultAction])

  function create() {
    if (!trigger.trim() || !action.trim()) return
    const planId = onCreated?.({ trigger: trigger.trim(), action: action.trim(), itemId })
    planIdRef.current = planId || ''
    trackPractice(analyticsEvents.planCreated, itemId)
    trackPractice(analyticsEvents.actionStarted, itemId)
    setPhase('active')
  }

  function complete() {
    onCompleted?.({ planId: planIdRef.current, itemId })
    trackPractice(analyticsEvents.actionCompleted, itemId)
    trackPractice(analyticsEvents.planCompleted, itemId)
    setPhase('done')
  }

  if (phase === 'done') {
    return (
      <div className="mt-6 border-t border-line pt-5">
        <p className="text-lg text-paper">{practiceCopy.doneMessage}</p>
        {welcome ? <p className="mt-2 text-sm text-body/70">{welcome}</p> : null}
      </div>
    )
  }

  if (phase === 'active') {
    return (
      <div className="mt-6 border-t border-line pt-5">
        <p className="text-sm text-quiet">Your plan</p>
        <p className="mt-2 leading-relaxed text-paper">
          When <span className="text-accent">{trigger}</span> happens, I will{' '}
          <span className="text-accent">{action}</span>.
        </p>
        <button type="button" className="btn mt-5" onClick={complete}>
          Mark complete
        </button>
      </div>
    )
  }

  return (
    <div className="mt-6 border-t border-line pt-5">
      {welcome ? <p className="mb-4 text-sm text-body/80">{welcome}</p> : null}
      <p className="text-sm text-quiet">{practiceCopy.planPrompt}</p>
      <label className="mt-4 block">
        <span className="text-[11px] uppercase tracking-[0.2em] text-quiet">When</span>
        <input
          className="mt-2 w-full border border-line bg-ink px-3 py-2 text-paper outline-none focus:border-accent"
          value={trigger}
          onChange={(e) => setTrigger(e.target.value)}
          placeholder="I finish breakfast"
          autoComplete="off"
          maxLength={200}
        />
      </label>
      <label className="mt-4 block">
        <span className="text-[11px] uppercase tracking-[0.2em] text-quiet">I will</span>
        <input
          className="mt-2 w-full border border-line bg-ink px-3 py-2 text-paper outline-none focus:border-accent"
          value={action}
          onChange={(e) => setAction(e.target.value)}
          placeholder={defaultAction || 'study for 20 minutes'}
          autoComplete="off"
          maxLength={200}
        />
      </label>
      <button type="button" className="btn mt-5" onClick={create} disabled={!trigger.trim() || !action.trim()}>
        {practiceCopy.startCta}
      </button>
    </div>
  )
}
