/** Classify a quote against the tagged library, then map the chosen tag to its scripture theme. */

import { themesMap } from '@/libs/tag-lane'
import { scoreQuote, tokenizeQuote, trainQuoteClassifier } from '@/libs/quote-classifier'

/**
 * Auto-check a tag only when it is at least this close to that tag's learned
 * examples. Cosine similarity, 0–1. Weaker guesses wait in the review queue.
 */
export const AUTO_TAG_CONFIDENCE = 0.36

const MAX_AUTO = 2
const MAX_REVIEW = 2
const MIN_TOKENS = 3

/** Scripture theme for one catalog tag. Empty when the tag has no pairing. */
export function themeForTag(tag, catalog) {
  if (!tag) return ''
  return themesMap(catalog)[tag] || ''
}

/** Second pass: the scripture theme follows the tag the classifier kept, not the quote text. */
export function assignScriptureTheme(tags, catalog) {
  return themeForTag(tags?.[0], catalog)
}

/**
 * @param {string} text
 * @param {{ name: string, theme?: string }[]} catalog
 * @param {{ text: string, tags: string[] }[]} examples tagged library quotes
 * @returns {{
 *   tags: string[],
 *   theme: string,
 *   scores: { tag: string, confidence: number }[],
 *   review: { tag: string, confidence: number, theme: string }[],
 *   needsReview: boolean,
 * }}
 */
export function suggestQuoteLane(text, catalog = [], examples = []) {
  const lanes = Array.isArray(catalog) ? catalog : []
  const names = lanes.map((tag) => tag?.name).filter(Boolean)
  const empty = { tags: [], theme: '', scores: [], review: [], needsReview: false }
  if (!String(text ?? '').trim() || !names.length) return empty

  const scores = scoreQuote(trainQuoteClassifier(examples, names), text)
  if (!scores.length) return empty

  const auto = scores.filter((row) => row.confidence >= AUTO_TAG_CONFIDENCE).slice(0, MAX_AUTO)
  const tags = auto.map((row) => row.tag)
  const theme = assignScriptureTheme(tags, lanes)

  const unsure = tokenizeQuote(text).length >= MIN_TOKENS && !auto.length
  const review = unsure
    ? scores
        .filter((row) => row.confidence > 0)
        .slice(0, MAX_REVIEW)
        .map((row) => ({ ...row, theme: themeForTag(row.tag, lanes) }))
    : []

  return { tags, theme, scores, review, needsReview: unsure }
}
