/**
 * Copy + routes for the /preview redesign ("the deck"). Lives on its own so the
 * whole experiment can be deleted, or promoted, in one move.
 */

/** Live href → its /preview twin, so the real URL builders stay the source of truth. */
export const pv = (href) => `/preview${href === '/' ? '' : href}`

export const previewNav = [
  { href: '/', label: 'Home' },
  { href: '/quotes', label: 'Quotes' },
  { href: '/shop', label: 'Shop' },
  { href: '/tees', label: 'Tee designs' },
  { href: '/blog', label: 'Blog' },
  { href: '/books', label: 'Books' },
]

export const previewCopy = {
  kicker: 'Be better than yesterday.',
  title: 'How do you feel?',
  sub: 'Pick a mood. We’ll deal one card.',
  today: 'Today',
  yesterday: 'Yesterday',
  another: 'Deal another',
  all: 'All',
  deckLabel: 'The deck',
  deckAll: 'See all cards',
  wearKicker: 'The shop',
  wearTitle: { tee: 'This one, on a tee.', mug: 'This one, on a mug.' },
  wearSub: 'Printed when you order — nothing sitting in a warehouse.',
  wearCta: 'Make this one',
  readLabel: 'Read deeper',
  newsletterTitle: 'Get the deck in your inbox.',
  newsletterSub: 'New cards as they land — plus blog and book notes if you want them.',
  quotesTitle: 'Every card.',
  shuffle: 'Shuffle',
  likeThis: 'Another like this',
  shopTitle: 'Wear the words.',
  ownTitle: 'Your words, on a tee.',
  ownSub: 'Write a line, pick tee or mug, and we print just that one.',
  blogTitle: 'Notes.',
  noteCard: 'The card for this note',
  booksTitle: 'The shelf.',
  booksCard: 'Card that goes with it',
  teesTitle: 'Tee designs.',
  teesSub: 'Mockups only — the real print files stay as they are until you pick one.',
}

/** Latest cards in the sideways deck strip. */
export const previewDeckCount = 12

/** Tee design proposals (mockups only — print renderer untouched). */
export const teeLooks = [
  {
    id: 'iceberg',
    label: 'Brand font',
    note: 'Iceberg, the site’s headline font.',
  },
  {
    id: 'serial',
    label: 'Numbered',
    note: 'Adds “#20 · bebetteryou.online” under the quote.',
    serial: true,
  },
  {
    id: 'card',
    label: 'Card print',
    note: 'The card itself — panel, mark and number.',
    card: true,
  },
]
