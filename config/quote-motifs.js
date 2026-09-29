/** Tag → motif id. First matching tag in this order wins. */
export const motifPriority = ['Motivation', 'Mindset', 'Growth', 'Love', 'Yourself']

export const motifByTag = {
  Motivation: 'spark',
  Mindset: 'lens',
  Growth: 'sprout',
  Love: 'heart',
  Yourself: 'figure',
}

/** Fallback cycle when a quote has no mapped tags (stable on `n`). */
export const motifFallback = ['spark', 'lens', 'sprout', 'heart', 'figure']
