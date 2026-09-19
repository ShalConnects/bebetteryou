/**
 * Practice layer — motivation → one small action.
 * Pure config; safe for client + server.
 */

export const practiceCategories = [
  'Motivation',
  'Discipline',
  'Focus',
  'Overwhelm',
  'Confidence',
  'Procrastination',
  'Failure',
  'Consistency',
  'Goals',
  'Personal Growth',
  'Starting Over',
]

/** Intent chips → category. */
export const practiceIntents = [
  { id: 'push', label: 'I need a push', category: 'Motivation' },
  { id: 'procrastinating', label: "I'm procrastinating", category: 'Procrastination' },
  { id: 'overwhelmed', label: 'I feel overwhelmed', category: 'Overwhelm' },
  { id: 'restart', label: 'I failed and need to restart', category: 'Starting Over' },
  { id: 'discipline', label: 'I need discipline', category: 'Discipline' },
  { id: 'confidence', label: 'I need confidence', category: 'Confidence' },
  { id: 'start', label: "I don't know where to start", category: 'Goals' },
  { id: 'focus', label: 'I need to focus', category: 'Focus' },
  { id: 'fresh', label: 'I need a fresh start', category: 'Starting Over' },
]

/** Blog tag / topic → practice category for Try This. */
export const practiceCategoryByTag = {
  Motivation: 'Motivation',
  Mindset: 'Focus',
  Growth: 'Personal Growth',
  Yourself: 'Confidence',
  Discipline: 'Discipline',
  Focus: 'Focus',
  Consistency: 'Consistency',
}

export const practiceCategoryByTopic = {
  motivation: 'Motivation',
  discipline: 'Discipline',
  focus: 'Focus',
  confidence: 'Confidence',
  consistency: 'Consistency',
  mindset: 'Focus',
  growth: 'Personal Growth',
}

export const practiceCopy = {
  navLabel: 'Practice',
  homeTitle: 'One useful action',
  homeSub: 'A short thought, one small step, and a plan you can finish today.',
  homeCtaTitle: 'Need one action today?',
  homeCtaSub: 'A calm reset — one thought, one small step.',
  homeCta: 'Start Practice',
  resetLabel: "Today's Reset",
  intentLabel: 'What do you need right now?',
  intentHint: 'Pick the kind of support you want — not a diagnosis.',
  planPrompt: 'When ______ happens, I will ______.',
  startCta: 'Start My Plan',
  doneMessage: "Done. That's enough for today.",
  backMessage: "You're back. Today is a new start.",
  continueMessage: "Let's continue.",
  savedTitle: 'Saved',
  savedEmpty: 'Nothing saved yet. Bookmark a thought or plan from Practice.',
  progressTitle: 'Days you showed up',
  progressSub: 'Missed days don’t count against you.',
  recentTitle: 'Recent activity',
  recentEmpty: 'Complete a plan to see activity here.',
  newsletterTitle: 'One useful thought for your week.',
  newsletterSub: 'No guilt loops. Just something worth thinking about.',
  tryThisLabel: 'Try this',
  tryThisCta: 'Make this my plan',
  disclaimer: 'Practical self-improvement — not medical or mental-health advice.',
}

/** Future paid surfaces — stubs only; core Reset stays free. */
export const practiceMonetization = {
  premiumChallenges: false,
  journals: false,
  actionPacks: false,
  membership: false,
  sponsorships: false,
  /** Core daily reset must never require payment. */
  resetPaywalled: false,
}

export const practiceStoreKey = 'bby:practice'

/** Hide from public chrome until launch; flag still gates routes. */
export const practiceShowInNav = false
/** Home CTA + sitemap — keep false until you want Practice discoverable. */
export const practiceDiscoverable = false
