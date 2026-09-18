/**
 * Client persistence for Practice. Guests only (localStorage).
 * Never store free-text reflections in analytics — only ids and counts here.
 */
import { practiceStoreKey } from '@/config/practice'

const empty = () => ({
  saved: [],
  plans: [],
  completedDays: [],
  completions: [],
})

function canUse() {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
}

export function readPracticeState() {
  if (!canUse()) return empty()
  try {
    const raw = JSON.parse(localStorage.getItem(practiceStoreKey) || 'null')
    if (!raw || typeof raw !== 'object') return empty()
    return {
      saved: Array.isArray(raw.saved) ? raw.saved.filter(Boolean) : [],
      plans: Array.isArray(raw.plans) ? raw.plans : [],
      completedDays: Array.isArray(raw.completedDays) ? raw.completedDays : [],
      completions: Array.isArray(raw.completions) ? raw.completions : [],
    }
  } catch {
    return empty()
  }
}

function write(state) {
  if (!canUse()) return state
  try {
    localStorage.setItem(practiceStoreKey, JSON.stringify(state))
  } catch {
    /* private mode */
  }
  return state
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
    trigger: String(trigger || '').trim(),
    action: String(action || '').trim(),
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

export function recordCompletion({ itemId, kind = 'action', dayKey }) {
  const state = readPracticeState()
  const day = dayKey || new Date().toISOString().slice(0, 10)
  const completedDays = state.completedDays.includes(day)
    ? state.completedDays
    : [...state.completedDays, day]
  const completions = [
    { itemId, kind, at: new Date().toISOString(), day },
    ...state.completions,
  ].slice(0, 100)
  return write({ ...state, completedDays, completions })
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
  }
}
