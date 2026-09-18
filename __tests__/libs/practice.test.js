/**
 * @jest-environment node
 */
import {
  getPracticeItem,
  itemForIntent,
  itemForPost,
  listPracticeItems,
  todayReset,
  utcDayKey,
} from '@/libs/practice'
import { practiceStats } from '@/libs/practice-store'

describe('practice content', () => {
  it('loads curated items with required fields', () => {
    const items = listPracticeItems()
    expect(items.length).toBeGreaterThanOrEqual(10)
    for (const item of items) {
      expect(item.id).toBeTruthy()
      expect(item.thought).toBeTruthy()
      expect(item.action).toBeTruthy()
      expect(item.category).toBeTruthy()
      expect(item.isOriginal).toBe(true)
    }
  })

  it('resolves intents and posts to an item', () => {
    expect(itemForIntent('procrastinating').category).toBe('Procrastination')
    expect(getPracticeItem('enough-for-today')?.id).toBe('enough-for-today')
    expect(itemForPost({ tag: 'Mindset', topic: 'focus' }).category).toBe('Focus')
  })

  it('picks a stable daily reset', () => {
    const a = todayReset(new Date('2026-09-18T12:00:00Z'))
    const b = todayReset(new Date('2026-09-18T23:00:00Z'))
    expect(a.id).toBe(b.id)
    expect(utcDayKey(new Date('2026-09-18T12:00:00Z'))).toBe('2026-09-18')
  })
})

describe('practiceStats', () => {
  it('summarizes days without streak punishment fields', () => {
    const stats = practiceStats({
      saved: ['a'],
      plans: [
        { id: '1', completed: false },
        { id: '2', completed: true },
      ],
      completedDays: ['2026-09-17', '2026-09-18'],
      completions: [],
    })
    expect(stats.daysShownUp).toBe(2)
    expect(stats.savedCount).toBe(1)
    expect(stats.openPlans).toBe(1)
    expect(stats.donePlans).toBe(1)
    expect(stats).not.toHaveProperty('streak')
  })
})
