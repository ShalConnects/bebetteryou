/** Quotes list paging + seed taxonomy (runtime catalog lives in data/tags.json). */
export const quotesIntro = 'Short lines to screenshot, share, and come back to.'
export const homeQuoteCount = 9
export const heroQuoteCount = 5
export const quotesPageSize = 24

/** Seed / fallback — persisted catalog may grow via admin. Theme links scripture; hashtags feed social. */
export const tagSeed = [
  { name: 'Motivation', moodLabel: 'Need a push', theme: 'perseverance', hashtags: '#motivation #bebetteryou' },
  { name: 'Mindset', moodLabel: 'Clear my head', theme: 'clarity', hashtags: '#mindset #bebetteryou' },
  { name: 'Growth', moodLabel: 'Level up', theme: 'growth', hashtags: '#growth #bebetteryou' },
  { name: 'Love', moodLabel: 'Soft landing', theme: 'love', hashtags: '#love #bebetteryou' },
  { name: 'Yourself', moodLabel: 'Tough love', theme: 'self-worth', hashtags: '#selfworth #bebetteryou' },
]
