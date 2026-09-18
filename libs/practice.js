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

export function itemForIntent(intentId) {
  const intent = practiceIntents.find((row) => row.id === intentId)
  if (!intent) return items[0]
  const pool = itemsByCategory(intent.category)
  return pool[0] || items[0]
}

export function resetPool() {
  const flagged = items.filter((item) => item.reset)
  return flagged.length ? flagged : items
}

/** Stable UTC day → reset item (no shame for missed days). */
export function todayReset(now = new Date()) {
  const pool = resetPool()
  const day = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const index = Math.abs(Math.floor(day / 86_400_000)) % pool.length
  return pool[index]
}

export function utcDayKey(now = new Date()) {
  return now.toISOString().slice(0, 10)
}

/** Soft match for blog Try This — tag, then topic, then a calm default. */
export function itemForPost(post) {
  const tag = post?.tag
  const category =
    (tag && practiceCategoryByTag[tag]) ||
    (post?.topic && practiceCategoryByTopic[post.topic]) ||
    'Motivation'
  return itemsByCategory(category)[0] || items[0]
}

export function shareTextForItem(item, url) {
  const lines = [item.thought, `Try: ${item.action}`]
  if (item.source) lines.push(`— ${item.source}`)
  lines.push(url)
  return lines.filter(Boolean).join('\n')
}
