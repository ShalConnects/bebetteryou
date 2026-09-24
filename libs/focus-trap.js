/** Visible focusables inside root (skips display:none / zero-box). */
export function focusables(root) {
  if (!root) return []
  return [
    ...root.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])'
    ),
  ].filter((el) => {
    if (el.getAttribute('aria-hidden') === 'true') return false
    // offsetParent is null for position:fixed, so use layout boxes instead.
    return el.getClientRects().length > 0
  })
}

/** Escape → onEscape; Tab cycles within root. Returns cleanup. */
export function bindFocusTrap(root, { onEscape } = {}) {
  const onKey = (e) => {
    if (e.key === 'Escape') {
      onEscape?.()
      return
    }
    if (e.key !== 'Tab' || !root) return
    const list = focusables(root)
    if (list.length < 2) return
    const first = list[0]
    const last = list[list.length - 1]
    if (e.shiftKey ? document.activeElement === first : document.activeElement === last) {
      e.preventDefault()
      ;(e.shiftKey ? last : first).focus()
    }
  }
  document.addEventListener('keydown', onKey)
  return () => document.removeEventListener('keydown', onKey)
}
