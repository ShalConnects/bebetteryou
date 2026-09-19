/**
 * Practice content accessors — file data only, no React.
 */
import {
  practiceCategoryByTag,
  practiceCategoryByTopic,
  practiceIntents,
} from '@/config/practice'
import items from '@/data/practice/items.json'

export function listPracticeItems() {
  return items
}

export function getPracticeItem(id) {
  return items.find((item) => item.id === id) || null
}

export function itemsByCategory(category) {
  return items.filter((item) => item.category === category)
}

/** Stable pick from a pool using UTC day + salt (intent id, post slug, …). */
export function pickFromPool(pool, salt = '', now = new Date()) {
  if (!pool?.length) return items[0]
  const day = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  let hash = Math.floor(day / 86_400_000)
  const key = String(salt)
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  return pool[hash % pool.length]
}

export function itemForIntent(intentId, now = new Date()) {
  const intent = practiceIntents.find((row) => row.id === intentId)
  if (!intent) return pickFromPool(items, 'default', now)
  return pickFromPool(itemsByCategory(intent.category), intent.id, now)
}

export function resetPool() {
  const flagged = items.filter((item) => item.reset)
  return flagged.length ? flagged : items
}

/** Stable UTC day → reset item (content rotation; not progress). */
export function todayReset(now = new Date()) {
  return pickFromPool(resetPool(), 'reset', now)
}

/** Calendar day in the user's local timezone (progress / welcome). */
export function localDayKey(now = new Date()) {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** @deprecated use localDayKey — kept for older imports */
export const utcDayKey = localDayKey

export function yesterdayKey(day = localDayKey()) {
  const [y, m, d] = String(day).split('-').map(Number)
  if (!y || !m || !d) return day
  return localDayKey(new Date(y, m - 1, d - 1))
}

/**
 * Soft match for blog Try This.
 * Prefer editorial `post.tryThis`, then tag/topic category.
 */
export function itemForPost(post, now = new Date()) {
  const pinned = post?.tryThis?.itemId ? getPracticeItem(post.tryThis.itemId) : null
  if (pinned) {
    return {
      ...pinned,
      tryThisSteps: post.tryThis.steps,
      tryThisTrigger: post.tryThis.trigger,
    }
  }
  const tag = post?.tag
  const category =
    (tag && practiceCategoryByTag[tag]) ||
    (post?.topic && practiceCategoryByTopic[post.topic]) ||
    'Motivation'
  return pickFromPool(itemsByCategory(category), post?.slug || category, now)
}

export function shareTextForItem(item, url) {
  const lines = [item.thought, item.context, `Try: ${item.action}`]
  if (item.source) lines.push(`— ${item.source}`)
  lines.push(url)
  return lines.filter(Boolean).join('\n')
}

/** HowTo structured data for a practice item. */
export function practiceItemJsonLd(item, url) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: item.title || item.thought,
    description: item.thought,
    totalTime: item.estimatedMinutes ? `PT${item.estimatedMinutes}M` : undefined,
    step: [
      ...(item.question ? [{ '@type': 'HowToStep', name: 'Reflect', text: item.question }] : []),
      { '@type': 'HowToStep', name: 'Action', text: item.action },
    ],
    url,
    isAccessibleForFree: true,
  }
}
