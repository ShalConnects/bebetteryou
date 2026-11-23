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
  { href: '/printables', label: 'Printables' },
  { href: '/themes/courage', label: 'Theme page' },
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

/** Monetization proposals — prices are suggestions to decide on, nothing is for sale yet. */
export const printables = {
  title: 'Take the words home.',
  sub: 'Proposal: instant downloads, nothing to ship. Prices are suggestions — nothing is for sale yet.',
  wall: { title: 'Wall art', price: '$3', note: 'Print-ready PDF · 8×10, 11×14, A4 and A3 in one download' },
  phone: { title: 'Phone wallpapers', price: '$2', note: 'One card sized for iPhone and Android lock screens' },
  guide: { title: 'Guides', price: '$5', note: 'A short daily guide per theme, in each tradition’s own words' },
  guideDays: 3,
  guideNote:
    'Each tradition has 3 checked passages per theme, so a guide is 3 days today. A 7-day guide needs 4 more checked passages per theme and tradition.',
  ownTitle: 'Own this card',
  signupTitle: 'One card in your inbox, four times a week.',
}

/** Theme page intro + guide prompt (a question, then one small thing to do). */
export const themeCopy = {
  perseverance: ['Keep going when it’s hard.', 'What would one more step look like today?', 'Do the smallest next piece, then stop.'],
  courage: ['Act while you’re still afraid.', 'What are you avoiding because it scares you?', 'Take one small step toward it before noon.'],
  hope: ['Things can get better.', 'What’s one thing that went right this week?', 'Write it down and keep the note.'],
  clarity: ['See it plainly, then choose.', 'What do you already know you should do?', 'Write the decision in one sentence.'],
  peace: ['Calm in the middle of it.', 'What can you let be today?', 'Take three slow breaths before your next task.'],
  patience: ['Wait well.', 'Where are you rushing something that needs time?', 'Pause before you reply to anyone today.'],
  growth: ['Better than yesterday.', 'What did a mistake teach you recently?', 'Practise one skill for ten minutes.'],
  discipline: ['Small promises, kept.', 'Which habit would change the most if you kept it?', 'Do it today, at the same time you’ll do it tomorrow.'],
  gratitude: ['Notice what you already have.', 'Who made your week easier?', 'Tell them, in one message.'],
  love: ['Care, out loud.', 'Who needs to hear from you?', 'Reach out without a reason.'],
  forgiveness: ['Put the weight down.', 'What are you still carrying from someone else?', 'Write what you’d say, then let the page keep it.'],
  'letting-go': ['Open your hands.', 'What are you holding that isn’t yours to hold?', 'Clear one thing you’ve been keeping “just in case”.'],
  'self-worth': ['You’re enough as you are.', 'What would you say to a friend in your place?', 'Say it to yourself.'],
  rest: ['Rest is part of the work.', 'When did you last stop without guilt?', 'Take a real break today — no phone.'],
  purpose: ['Why you do what you do.', 'What would you do even if no one noticed?', 'Spend twenty minutes on it today.'],
}
