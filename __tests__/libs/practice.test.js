/**
 * @jest-environment jsdom
 */
import {
  getPracticeItem,
  itemForIntent,
  itemForPost,
  listPracticeItems,
  localDayKey,
  pickFromPool,
  practiceItemJsonLd,
  todayReset,
  yesterdayKey,
} from '@/libs/practice'
import {
  PLAN_TEXT_MAX,
  finishPractice,
  mergePracticeState,
  practiceStats,
  returnTone,
  savePlan,
  readPracticeState,
  replacePracticeState,
} from '@/libs/practice-store'

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

  it('rotates intent picks and separates overwhelm from focus', () => {
    const day = new Date('2026-09-18T12:00:00Z')
    expect(itemForIntent('overwhelmed', day).category).toBe('Overwhelm')
    expect(itemForIntent('focus', day).category).toBe('Focus')
    expect(getPracticeItem('enough-for-today')?.id).toBe('enough-for-today')
  })

  it('honors editorial tryThis on posts', () => {
    const item = itemForPost({
      slug: 'focus-when-everything-is-loud',
      tryThis: { itemId: 'one-door', steps: ['A'], trigger: 'desk' },
    })
    expect(item.id).toBe('one-door')
    expect(item.tryThisSteps).toEqual(['A'])
    expect(item.tryThisTrigger).toBe('desk')
  })

  it('picks a stable daily reset and local day keys', () => {
    const a = todayReset(new Date('2026-09-18T12:00:00Z'))
    const b = todayReset(new Date('2026-09-18T23:00:00Z'))
    expect(a.id).toBe(b.id)
    expect(pickFromPool([{ id: 'x' }, { id: 'y' }], 'salt', new Date('2026-01-01Z')).id).toBeTruthy()
    expect(localDayKey(new Date(2026, 8, 18, 12))).toBe('2026-09-18')
    expect(yesterdayKey('2026-09-18')).toBe('2026-09-17')
  })

  it('builds HowTo json-ld', () => {
    const json = practiceItemJsonLd(getPracticeItem('one-door'), 'https://example.com/practice')
    expect(json['@type']).toBe('HowTo')
    expect(json.step.length).toBeGreaterThanOrEqual(1)
  })
})

describe('practiceStats and returnTone', () => {
  beforeEach(() => {
    replacePracticeState({ saved: [], plans: [], completedDays: [], completions: [] })
  })

  it('summarizes days without streak punishment fields', () => {
    const stats = practiceStats({
      saved: ['a'],
      plans: [
        { id: '1', completed: false },
        { id: '2', completed: true },
      ],
      completedDays: ['2026-09-17', '2026-09-18'],
      completions: [{ itemId: 'a', kind: 'reset', at: 't', day: '2026-09-18' }],
    })
    expect(stats.daysShownUp).toBe(2)
    expect(stats.savedCount).toBe(1)
    expect(stats.openPlans).toBe(1)
    expect(stats.donePlans).toBe(1)
    expect(stats.recent).toHaveLength(1)
    expect(stats).not.toHaveProperty('streak')
  })

  it('welcomes back after a gap without shaming', () => {
    expect(returnTone({ completedDays: ['2026-09-10'] }, '2026-09-18')).toBe('back')
    expect(returnTone({ completedDays: ['2026-09-17'] }, '2026-09-18')).toBe('continue')
    expect(returnTone({ completedDays: ['2026-09-18'] }, '2026-09-18')).toBeNull()
  })

  it('merges local and remote progress', () => {
    const merged = mergePracticeState(
      { saved: ['a'], plans: [], completedDays: ['2026-09-17'], completions: [] },
      { saved: ['b'], plans: [{ id: '1', createdAt: '2026-09-18' }], completedDays: ['2026-09-18'], completions: [] }
    )
    expect(merged.saved.sort()).toEqual(['a', 'b'])
    expect(merged.completedDays).toEqual(['2026-09-17', '2026-09-18'])
    expect(merged.plans).toHaveLength(1)
  })

  it('finishPractice closes the plan and counts the day', () => {
    savePlan({ trigger: 'morning', action: 'walk', itemId: 'quiet-push' })
    const planId = readPracticeState().plans[0].id
    const next = finishPractice({ planId, itemId: 'quiet-push', kind: 'reset', dayKey: '2026-09-19' })
    expect(next.plans[0].completed).toBe(true)
    expect(next.completedDays).toContain('2026-09-19')
    expect(next.completions[0].itemId).toBe('quiet-push')
  })

  it('clips plan text to PLAN_TEXT_MAX', () => {
    const long = 'x'.repeat(PLAN_TEXT_MAX + 40)
    savePlan({ trigger: long, action: long, itemId: 'a' })
    const plan = readPracticeState().plans[0]
    expect(plan.trigger).toHaveLength(PLAN_TEXT_MAX)
    expect(plan.action).toHaveLength(PLAN_TEXT_MAX)
  })
})
