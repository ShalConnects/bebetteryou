/** Books catalog + affiliate disclosure (rows live in data/books). */
export const booksPageSize = 24
export const booksIntro =
  'Motivation reads we recommend — linked with Amazon affiliate tags when configured.'

/** Shown on affiliate links — empty when the associate tag is unset. */
export const amazonTag = process.env.NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG || ''
export const affiliateDisclosure = amazonTag
  ? 'As an Amazon Associate, BeBetterYou earns from qualifying purchases.'
  : ''
export const bookRel = amazonTag ? 'noopener noreferrer sponsored' : 'noopener noreferrer'

/** Build an Amazon product URL; attaches the associate tag when set. */
export function bookUrl({ asin, url } = {}) {
  if (url) return url
  if (!asin) return ''
  const base = `https://www.amazon.com/dp/${asin}`
  return amazonTag ? `${base}?tag=${encodeURIComponent(amazonTag)}` : base
}
