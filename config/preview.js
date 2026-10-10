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
  all: 'All',
  quotesTitle: 'Every card.',
  shuffle: 'Shuffle',
  likeThis: 'Another like this',
  moreLike: 'More like this',
  shopTitle: 'Wear the words.',
  shopOff: 'Print shop is switched off on this build, so the designs show but checkout links won’t open.',
  blogTitle: 'Notes.',
  noteCard: 'The card for this note',
  keepReading: 'Keep reading',
  booksTitle: 'The shelf.',
  booksCard: 'Card that goes with it',
  teesTitle: 'Tee designs.',
  teesSub: 'Mockups only — the real print files stay as they are until you pick one.',
}

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
