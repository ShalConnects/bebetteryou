import { trends } from '@/config/trends'

/** BlackFriday -> black-friday */
const kebab = (tag) => tag.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase()

/** /trends/black-friday-2026-11-28: the topic for search, the date to keep each day unique. */
export const trendSlug = ({ hashtag, date }) => [kebab(hashtag || ''), date].filter(Boolean).join('-')
export const trendPath = (row) => `/trends/${trendSlug(row)}`
export const dateFromSlug = (slug) => slug.slice(-10)

/** Card corner: the hashtag when it fits, else TRENDING. */
export const cardLabel = ({ hashtag }) => (hashtag && hashtag.length <= 16 ? `#${hashtag}` : trends.label)

/** Sat, 28 Nov 2026 */
export const trendDay = (date) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
export const sourceName = { google: 'Google', x: 'X', bluesky: 'Bluesky' }
