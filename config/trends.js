/** Trend posts: one motivational card a day from what the US is talking about. */
export const trends = {
  /** Sources take turns by date; if one has nothing safe, the next is tried. */
  sources: ['google', 'x', 'bluesky'],
  google: 'https://trends.google.com/trending/rss?geo=US',
  /** X WOEID for the United States. */
  woeid: 23424977,
  bluesky: 'https://public.api.bsky.app/xrpc/app.bsky.unspecced.getTrends?limit=25',
  /** Bluesky categories dropped before the AI sees them. */
  blockedCategories: ['politics', 'sports'],
  /** Drafted in the 8 pm run (14:00 UTC); posted at 11 pm Bangladesh (17:00 UTC) once approved. */
  postHourUtc: 17,
  /** Friday is week-review day. */
  skipWeekday: 5,
  author: 'BeBetterYou',
  /** Card corner label in place of a card number. */
  label: 'TRENDING',
  model: 'claude-haiku-4-5-20251001',
}

export const trendRules = `Skip anything about: death, illness, crime, violence, disasters, accidents, war, politics or government, a named real person, a company, brand, product or game, a sports match, injury or result, religion, money or markets, or anything sad or divisive.
Good picks: holidays, seasons, weather moods, nature, hobbies, community moments, milestones, launches of the season (first snow, new year), universal feelings.`
