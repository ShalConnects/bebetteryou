/**
 * Client persistence for Practice.
 * Guests: localStorage. Signed-in: optional merge via /api/user/practice.
 * Never store free-text reflections in analytics — only ids and counts here.
 */
import { practiceCopy, practiceStoreKey } from '@/config/practice'
import { localDayKey, yesterdayKey } from '@/libs/practice'

export const PRACTICE_CHANGE = 'bby:practice'
export const PLAN_TEXT_MAX = 200

const empty = () => ({
  saved: [],
  plans: [],
  completedDays: [],
  completions: [],
})

let cloudEnabled = false

export function setPracticeCloud(on) {
  cloudEnabled = Boolean(on)
}

function canUse() {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
}

function clip(text) {
  return String(text || '').trim().slice(0, PLAN_TEXT_MAX)
}

function normalize(raw) {
  if (!raw || typeof raw !== 'object') return empty()
  return {
    saved: Array.isArray(raw.saved) ? [...new Set(raw.saved.filter(Boolean))].slice(0, 80) : [],
    plans: Array.isArray(raw.plans)
      ? raw.plans.slice(0, 40).map((plan) => ({
          ...plan,
          trigger: clip(plan.trigger),
          action: clip(plan.action),
        }))
      : [],
    completedDays: Array.isArray(raw.completedDays)
      ? [...new Set(raw.completedDays.filter(Boolean))].sort().slice(-400)
      : [],
    completions: Array.isArray(raw.completions) ? raw.completions.slice(0, 100) : [],
  }
}

export function notifyPracticeChange() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(PRACTICE_CHANGE))
}

export function readPracticeState() {
  if (!canUse()) return empty()
  try {
    return normalize(JSON.parse(localStorage.getItem(practiceStoreKey) || 'null'))
  } catch {
    return empty()
  }
}

function write(state) {
  const next = normalize(state)
  if (!canUse()) return next
  try {
    localStorage.setItem(practiceStoreKey, JSON.stringify(next))
  } catch {
    /* private mode */
  }
  notifyPracticeChange()
  return next
}

export function replacePracticeState(state) {
  return write(state)
}

/** Union local + remote without dropping either side's progress. */
export function mergePracticeState(local, remote) {
  const a = normalize(local)
  const b = normalize(remote)
  const plans = [...a.plans, ...b.plans]
    .sort((x, y) => String(y.createdAt || '').localeCompare(String(x.createdAt || '')))
    .filter((plan, i, all) => all.findIndex((p) => p.id === plan.id) === i)
    .slice(0, 40)
  const completions = [...a.completions, ...b.completions]
    .sort((x, y) => String(y.at || '').localeCompare(String(x.at || '')))
    .filter((row, i, all) => all.findIndex((r) => r.at === row.at && r.itemId === row.itemId) === i)
    .slice(0, 100)
  return normalize({
    saved: [...a.saved, ...b.saved],
    plans,
    completedDays: [...a.completedDays, ...b.completedDays],
    completions,
  })
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function toggleSaved(itemId) {
  const state = readPracticeState()
  const saved = state.saved.includes(itemId)
    ? state.saved.filter((id) => id !== itemId)
    : [...state.saved, itemId]
  return write({ ...state, saved })
}

export function isSaved(itemId) {
  return readPracticeState().saved.includes(itemId)
}

export function savePlan({ trigger, action, itemId = '' }) {
  const state = readPracticeState()
  const plan = {
    id: uid(),
    trigger: clip(trigger),
    action: clip(action),
    itemId,
    completed: false,
    createdAt: new Date().toISOString(),
  }
  return write({ ...state, plans: [plan, ...state.plans].slice(0, 40) })
}

export function completePlan(planId) {
  const state = readPracticeState()
  const plans = state.plans.map((plan) =>
    plan.id === planId ? { ...plan, completed: true, completedAt: new Date().toISOString() } : plan
  )
  return write({ ...state, plans })
}

export function deletePlan(planId) {
  const state = readPracticeState()
  return write({ ...state, plans: state.plans.filter((plan) => plan.id !== planId) })
}

export function recordCompletion({ itemId, kind = 'action', dayKey }) {
  const state = readPracticeState()
  const day = dayKey || localDayKey()
  const completedDays = state.completedDays.includes(day)
    ? state.completedDays
    : [...state.completedDays, day]
  const completions = [
    { itemId, kind, at: new Date().toISOString(), day },
    ...state.completions,
  ].slice(0, 100)
  return write({ ...state, completedDays, completions })
}

/** Close plan (optional) and count the day in one shot. */
export function finishPractice({ planId, itemId, kind = 'action', dayKey } = {}) {
  if (planId) completePlan(planId)
  return recordCompletion({ itemId: itemId || planId || '', kind, dayKey })
}

/**
 * Welcome tone after a gap — never shame missed days.
 * @returns {'back'|'continue'|null}
 */
export function returnTone(state = readPracticeState(), today = localDayKey()) {
  const days = [...(state.completedDays || [])].filter(Boolean).sort()
  if (!days.length) return null
  const last = days[days.length - 1]
  if (last >= today) return null
  if (last < yesterdayKey(today)) return 'back'
  return 'continue'
}

export function returnMessage(tone) {
  if (tone === 'back') return practiceCopy.backMessage
  if (tone === 'continue') return practiceCopy.continueMessage
  return ''
}

export function practiceStats(state = readPracticeState()) {
  const days = [...state.completedDays].sort()
  const recent = state.completions.slice(0, 8)
  const openPlans = state.plans.filter((p) => !p.completed).length
  const donePlans = state.plans.filter((p) => p.completed).length
  return {
    daysShownUp: days.length,
    savedCount: state.saved.length,
    openPlans,
    donePlans,
    recent,
    days,
    tone: returnTone(state),
  }
}

/** Best-effort cloud push — only after PracticeSync enables cloud for a DB user. */
export function pushPracticeState(state = readPracticeState()) {
  if (!cloudEnabled || typeof fetch === 'undefined') return
  fetch('/api/user/practice', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state),
  }).catch(() => {})
}
