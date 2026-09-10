/** Shared auth form styles (matches site monochrome). */
export const authInput =
  'w-full border border-line bg-ink px-4 py-3 text-paper outline-none focus:border-paper/40'
export const authBtn = 'btn w-full text-center disabled:opacity-50'
export const authOutline =
  'flex-1 border border-line px-4 py-2 text-sm text-paper transition-colors hover:border-paper/40'
export const authTab = (active) =>
  `flex-1 py-2 text-sm ${active ? 'bg-paper text-ink' : 'text-quiet hover:text-paper'}`
export const authError = 'text-sm text-red-400'
export const authMuted = 'text-sm text-quiet'
export const authLink = 'text-paper underline underline-offset-2'
