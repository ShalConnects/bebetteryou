/**
 * Homepage pitch — single source for hero, SEO, OG, and app description.
 * `APP_DESCRIPTION` overrides the joined string when set.
 */
export const heroLine = 'Be better than yesterday.'
export const heroSub = 'Quote cards every day — for the moments you need a push.'

export function sitePitch() {
  return process.env.APP_DESCRIPTION || `${heroLine} ${heroSub}`
}
